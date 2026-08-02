"""add_hnsw_index_to_document_chunks

Revision ID: e9a21b34c567
Revises: d8934821dd2c
Create Date: 2026-08-02 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9a21b34c567'
down_revision: Union[str, None] = 'd8934821dd2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create collection_id index on document_chunks if it doesn't exist
    op.create_index(
        op.f('ix_document_chunks_collection_id'),
        'document_chunks',
        ['collection_id'],
        unique=False,
        if_not_exists=True
    )
    
    # Create HNSW index for high-performance vector similarity search
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
        ON document_chunks 
        USING hnsw (embedding vector_cosine_ops) 
        WITH (m = 16, ef_construction = 64);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_document_chunks_embedding_hnsw;")
    op.drop_index(op.f('ix_document_chunks_collection_id'), table_name='document_chunks', if_exists=True)
