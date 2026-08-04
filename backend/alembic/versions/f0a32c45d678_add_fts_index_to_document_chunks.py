"""add_fts_index_to_document_chunks

Revision ID: f0a32c45d678
Revises: e9a21b34c567
Create Date: 2026-08-02 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f0a32c45d678'
down_revision: Union[str, None] = 'e9a21b34c567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create GIN index for full text search on document_chunks content
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_document_chunks_content_fts 
        ON document_chunks 
        USING gin (to_tsvector('english', content));
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_document_chunks_content_fts;")
