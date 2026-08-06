"""add_missing_chunk_columns

Revision ID: a1b2c3d4e5f6
Revises: f0a32c45d678
Create Date: 2026-08-05 20:52:00.000000

Adds the `page_number` and `chunk_metadata` columns to `document_chunks`.
These columns were defined in the SQLAlchemy ORM model but never added to the
actual database table, causing "column does not exist" errors at runtime.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f0a32c45d678'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add page_number column (nullable integer)
    op.add_column(
        'document_chunks',
        sa.Column('page_number', sa.Integer(), nullable=True)
    )

    # 2. Add chunk_metadata column (JSONB with server default of empty object)
    op.add_column(
        'document_chunks',
        sa.Column('chunk_metadata', JSONB(), server_default='{}', nullable=False)
    )

    # 3. Create GIN index on chunk_metadata for efficient JSONB queries
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_chunks_metadata_gin 
        ON document_chunks 
        USING gin (chunk_metadata);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_chunks_metadata_gin;")
    op.drop_column('document_chunks', 'chunk_metadata')
    op.drop_column('document_chunks', 'page_number')
