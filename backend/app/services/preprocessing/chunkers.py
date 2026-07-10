


import math
import re
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import tiktoken
from app.interfaces.ai.services import IEmbeddingService


@dataclass
class SentenceUnit:
    """Represents a single sentence with context metadata."""
    text: str
    token_count: int
    page_number: int
    headings: List[str]


def split_into_sentences(text: str) -> List[str]:
    """Splits raw text into sentences while ignoring common abbreviations."""
    if not text:
        return []
    
    # Sentence splitting regex that avoids splitting common abbreviations
    # Matches periods, exclamation, and question marks followed by space or end of string,
    # ensuring it's not preceded by common titles or short abbreviations.
    sentence_split_regex = re.compile(
        r'(?<!\b[A-Z])(?<!\b(?:Mr|Ms|Dr|St|Co|Jr|Sr|vs))(?<!\b(?:Mrs|Inc|Ltd|e\.g|i\.e|a\.m|p\.m))\b[\.\?\!](?=\s+|$)'
    )
    
    splits = sentence_split_regex.split(text)
    
    # Because split() removes the match character (e.g., the period), 
    # we reconstruct sentences by re-attaching punctuations.
    # Find all punctuation marks matching the regex
    matches = sentence_split_regex.findall(text)
    
    sentences = []
    for i in range(len(splits)):
        s = splits[i].strip()
        if not s:
            continue
        
        # If there's a corresponding punctuation mark, append it back
        if i < len(matches):
            s += matches[i]
            
        sentences.append(s)
        
    return sentences


def get_token_count(text: str, encoding_name: str = "cl100k_base") -> int:
    """Helper utility to count tokens in a string using tiktoken."""
    try:
        encoding = tiktoken.get_encoding(encoding_name)
    except Exception:
        encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text, disallowed_special=()))


def cosine_distance(vec1: List[float], vec2: List[float]) -> float:
    """Calculates cosine distance (1.0 - cosine_similarity) between two vectors."""
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = math.sqrt(sum(a * a for a in vec1))
    magnitude2 = math.sqrt(sum(b * b for b in vec2))
    if magnitude1 == 0 or magnitude2 == 0:
        return 1.0  # Max distance
    return 1.0 - (dot_product / (magnitude1 * magnitude2))


class TokenAwareChunker:
    """Splits a stream of SentenceUnits into token-aware overlapping chunks without breaking sentences."""

    def __init__(self, max_chunk_size: int = 500, chunk_overlap: int = 50, tokenizer_name: str = "cl100k_base"):
        self.max_chunk_size = max_chunk_size
        self.chunk_overlap = chunk_overlap
        self.tokenizer_name = tokenizer_name

    def chunk_sentences(self, sentences: List[SentenceUnit]) -> List[List[SentenceUnit]]:
        """Groups sentences into chunks, adhering to max_token constraints and token overlap."""
        if not sentences:
            return []

        chunks: List[List[SentenceUnit]] = []
        current_chunk: List[SentenceUnit] = []
        current_tokens = 0

        idx = 0
        while idx < len(sentences):
            su = sentences[idx]
            
            # If a single sentence exceeds the maximum chunk size, we force include it.
            # Otherwise, we create a new chunk.
            if current_tokens + su.token_count > self.max_chunk_size and current_chunk:
                chunks.append(current_chunk)
                
                # Determine overlap: step backward to find sentences for the next chunk's overlap
                overlap_tokens = 0
                overlap_sentences = []
                for prev_su in reversed(current_chunk):
                    if overlap_tokens + prev_su.token_count <= self.chunk_overlap:
                        overlap_sentences.insert(0, prev_su)
                        overlap_tokens += prev_su.token_count
                    else:
                        break
                
                # Initialize new chunk with the overlap sentences
                current_chunk = overlap_sentences
                current_tokens = overlap_tokens
                
            current_chunk.append(su)
            current_tokens += su.token_count
            idx += 1

        if current_chunk:
            chunks.append(current_chunk)

        return chunks


class SemanticChunker:
    """Chunks text by finding boundaries where adjacent sentences have low embedding similarity."""

    def __init__(
        self,
        embedding_service: Optional[IEmbeddingService] = None,
        max_chunk_size: int = 500,
        threshold_percentile: float = 90.0,
        tokenizer_name: str = "cl100k_base"
    ):
        self.embedding_service = embedding_service
        self.max_chunk_size = max_chunk_size
        self.threshold_percentile = threshold_percentile
        self.tokenizer_name = tokenizer_name
        self.token_chunker = TokenAwareChunker(
            max_chunk_size=max_chunk_size, 
            chunk_overlap=int(max_chunk_size * 0.1),
            tokenizer_name=tokenizer_name
        )

    async def chunk_sentences(self, sentences: List[SentenceUnit]) -> List[List[SentenceUnit]]:
        """Splits sentences using semantic similarity first, falling back to token limits if needed."""
        if not sentences:
            return []

        # If no embedding service is available, fallback directly to structure/token chunking
        if not self.embedding_service or len(sentences) < 2:
            return self.token_chunker.chunk_sentences(sentences)

        try:
            # 1. Generate embeddings for all sentences in a single batch
            sentence_texts = [s.text for s in sentences]
            embeddings = await self.embedding_service.generate_embeddings_batch(sentence_texts)
            
            # 2. Compute cosine distances between adjacent sentences
            distances: List[float] = []
            for i in range(len(embeddings) - 1):
                distances.append(cosine_distance(embeddings[i], embeddings[i+1]))

            # 3. Calculate distance threshold based on percentile
            sorted_distances = sorted(distances)
            percentile_idx = int(len(sorted_distances) * (self.threshold_percentile / 100.0))
            # Bound index safely
            percentile_idx = min(percentile_idx, len(sorted_distances) - 1)
            threshold = sorted_distances[percentile_idx] if sorted_distances else 0.5

            # 4. Determine split points
            semantic_chunks: List[List[SentenceUnit]] = []
            current_segment: List[SentenceUnit] = [sentences[0]]
            
            for i in range(len(distances)):
                next_sentence = sentences[i+1]
                distance = distances[i]
                
                # Split boundary detected
                if distance >= threshold:
                    semantic_chunks.append(current_segment)
                    current_segment = [next_sentence]
                else:
                    current_segment.append(next_sentence)
                    
            if current_segment:
                semantic_chunks.append(current_segment)

            # 5. Post-process semantic chunks to enforce maximum token constraints.
            # If any semantic chunk is too large, split it with TokenAwareChunker.
            final_chunks: List[List[SentenceUnit]] = []
            for chunk in semantic_chunks:
                chunk_tokens = sum(s.token_count for s in chunk)
                if chunk_tokens > self.max_chunk_size:
                    # Semantic chunk is too big, sub-split it using token chunker
                    sub_chunks = self.token_chunker.chunk_sentences(chunk)
                    final_chunks.extend(sub_chunks)
                else:
                    final_chunks.append(chunk)

            return final_chunks

        except Exception as e:
            # Fallback to token-aware chunker if anything fails (e.g. API limit errors)
            import logging
            logging.getLogger(__name__).warning(
                f"Embedding-based semantic chunking failed, falling back to token chunker: {e}"
            )
            return self.token_chunker.chunk_sentences(sentences)
