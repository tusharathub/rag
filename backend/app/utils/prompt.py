import tiktoken
from typing import List, Dict, Any, Optional
from app.domain.models.document import DocumentChunkDomain

class PromptBuilder:
    """Production prompt builder handling token management, history, and context structuring."""

    def __init__(self, model_name: str = "gpt-4o-mini", max_total_tokens: int = 128000):
        try:
            self.encoder = tiktoken.encoding_for_model(model_name)
        except Exception:
            # Fallback if offline or model not found
            self.encoder = tiktoken.get_encoding("cl100k_base")
        self.max_total_tokens = max_total_tokens
        # Reserve tokens for system prompt and generation response
        self.reserved_response_tokens = 2048

    def build_system_instructions(self) -> str:
        return (
            "You are an expert Retrieval-Augmented Generation assistant.\n"
            "Your task is to answer the user's question using ONLY the facts provided in the <context> section.\n"
            "Strict Grounding Rules:\n"
            "1. Rely only on the facts inside <context>. Do not assume, extrapolate, or bring in external knowledge.\n"
            "2. If the context is empty or does not contain enough information to answer, state: "
            "'I am sorry, but I cannot find that information in the uploaded documents.'\n"
            "3. Any fact you state must be followed by an inline citation format: [Document Name, Page Number].\n"
            "Example: 'The engine starts at 4000 RPM [User_Manual.pdf, p.10].'\n"
            "4. Do not state facts without citations."
        )

    def build_context_block(self, chunks: List[DocumentChunkDomain], available_tokens: int) -> str:
        """Structures chunks into XML tags and trims them if they exceed the token budget."""
        context_parts = ["<context>"]
        current_tokens = len(self.encoder.encode("<context>\n</context>"))

        for idx, chunk in enumerate(chunks, start=1):
            doc_name = chunk.metadata.get("section_path") or f"document_{chunk.document_id}"
            page_num = chunk.page_number if chunk.page_number is not None else "N/A"
            
            chunk_xml = (
                f'  <document id="doc_{idx}" name="{doc_name}" page="{page_num}">\n'
                f'    {chunk.content}\n'
                f'  </document>\n'
            )
            
            chunk_tokens = len(self.encoder.encode(chunk_xml))
            if current_tokens + chunk_tokens > available_tokens:
                break
                
            context_parts.append(chunk_xml)
            current_tokens += chunk_tokens

        context_parts.append("</context>")
        return "\n".join(context_parts)

    def assemble_final_prompt(
        self,
        user_question: str,
        chunks: List[DocumentChunkDomain],
        chat_history: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """Assembles system prompt, context, history, and user query into chat messages."""
        system_instruction = self.build_system_instructions()
        
        # Calculate available tokens for context and history
        prompt_overhead = len(self.encoder.encode(system_instruction + user_question))
        available_budget = self.max_total_tokens - self.reserved_response_tokens - prompt_overhead
        available_budget = max(0, available_budget)
        
        # Allocate 70% budget to context, 30% to history

        context_budget = int(available_budget * 0.70)
        history_budget = int(available_budget * 0.30)

        # 1. Build Context
        context_str = self.build_context_block(chunks, context_budget)

        # 2. Build History (Newest first, truncate to fit budget)
        formatted_history = []
        history_tokens = 0
        for msg in reversed(chat_history):
            msg_str = f"{msg['role']}: {msg['content']}\n"
            msg_tokens = len(self.encoder.encode(msg_str))
            if history_tokens + msg_tokens > history_budget:
                break
            formatted_history.insert(0, msg)
            history_tokens += msg_tokens

        # 3. Assemble messages payload
        messages = [
            {"role": "system", "content": system_instruction},
        ]
        
        # Inject context as a system boundary message preceding user prompt
        messages.append({
            "role": "system", 
            "content": f"Use this context to answer the user:\n{context_str}"
        })
        
        # Add history
        for msg in formatted_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        # Add final user question
        messages.append({"role": "user", "content": user_question})
        
        return messages
