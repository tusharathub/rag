import pytest
import uuid
from app.domain.models.document import DocumentChunkDomain
from app.utils.prompt import PromptBuilder

def test_prompt_builder_structure():
    builder = PromptBuilder(max_total_tokens=10000)

    
    chunk = DocumentChunkDomain(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        content="This is the search context content.",
        chunk_index=0,
        page_number=3,
        metadata={"section_path": "Introduction"}
    )
    
    history = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi there!"}
    ]
    
    messages = builder.assemble_final_prompt(
        user_question="How to configure?",
        chunks=[chunk],
        chat_history=history
    )
    
    # Verify we get system, context system block, history messages, and user query
    assert len(messages) == 5
    assert messages[0]["role"] == "system"
    assert "You are an expert Retrieval-Augmented Generation assistant." in messages[0]["content"]
    
    assert messages[1]["role"] == "system"
    assert "<context>" in messages[1]["content"]
    assert 'name="Introduction"' in messages[1]["content"]
    assert "page=\"3\"" in messages[1]["content"]
    
    assert messages[2]["role"] == "user"
    assert messages[2]["content"] == "Hello"
    
    assert messages[3]["role"] == "assistant"
    assert messages[3]["content"] == "Hi there!"
    
    assert messages[4]["role"] == "user"
    assert messages[4]["content"] == "How to configure?"


def test_prompt_builder_token_truncation():
    # Setup highly restricted token count to force truncation
    builder = PromptBuilder(max_total_tokens=100)
    
    chunks = [
        DocumentChunkDomain(
            id=uuid.uuid4(),
            document_id=uuid.uuid4(),
            content="This is text chunk number one that is fairly long.",
            chunk_index=0,
            page_number=1,
            metadata={}
        ),
        DocumentChunkDomain(
            id=uuid.uuid4(),
            document_id=uuid.uuid4(),
            content="This is text chunk number two that is also long.",
            chunk_index=1,
            page_number=2,
            metadata={}
        )
    ]
    
    # Assembling should run without raising budget exceptions, doing clean truncations
    messages = builder.assemble_final_prompt(
        user_question="Short question?",
        chunks=chunks,
        chat_history=[]
    )
    
    assert len(messages) >= 3
    # Check that context exists
    assert "<context>" in messages[1]["content"]
