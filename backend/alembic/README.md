# Alembic Database Migrations

This directory contains Alembic database migrations for the Centime Test Management System.

## Overview

Alembic is a lightweight database migration tool for SQLAlchemy. It provides a way to manage database schema changes in a version-controlled manner.

## Directory Structure

```
alembic/
├── versions/          # Migration scripts
├── env.py            # Alembic environment configuration
├── script.py.mako    # Template for new migrations
└── README.md         # This file
```

## Creating New Migrations

### Auto-generate from Model Changes

When you modify models in `app/models/models.py`:

```bash
cd backend
source venv/bin/activate
alembic revision --autogenerate -m "Description of changes"
```

This will:
1. Compare your models with the current database schema
2. Generate a migration script in `versions/`
3. The filename includes timestamp, revision ID, and description

### Manual Migration

For complex changes or data migrations:

```bash
alembic revision -m "Description of manual changes"
```

Then edit the generated file to add custom logic.

## Applying Migrations

### Upgrade to Latest

```bash
alembic upgrade head
```

### Upgrade Step by Step

```bash
alembic upgrade +1  # Upgrade one version
alembic upgrade +2  # Upgrade two versions
```

### Upgrade to Specific Version

```bash
alembic upgrade <revision_id>
```

## Downgrading Migrations

### Downgrade One Version

```bash
alembic downgrade -1
```

### Downgrade to Specific Version

```bash
alembic downgrade <revision_id>
```

### Downgrade All

```bash
alembic downgrade base
```

## Viewing Migration Status

### Current Version

```bash
alembic current
```

### Migration History

```bash
alembic history
alembic history --verbose  # More details
```

### Pending Migrations

```bash
alembic history --indicate-current
```

## Testing Migrations

### Dry Run (SQL Output Only)

```bash
alembic upgrade head --sql > migration.sql
```

Review the SQL before applying.

### Test in Development

1. Backup your database
2. Apply migration: `alembic upgrade head`
3. Test application
4. If issues: `alembic downgrade -1`

## Migration Script Structure

Each migration script has two functions:

### upgrade()

Contains the changes to apply when upgrading:

```python
def upgrade() -> None:
    # Add table
    op.create_table(
        'new_table',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add column
    op.add_column('existing_table', 
        sa.Column('new_column', sa.String(), nullable=True))
    
    # Create index
    op.create_index('idx_name', 'table_name', ['column'])
```

### downgrade()

Contains the changes to revert when downgrading:

```python
def downgrade() -> None:
    # Drop index
    op.drop_index('idx_name', 'table_name')
    
    # Drop column
    op.drop_column('existing_table', 'new_column')
    
    # Drop table
    op.drop_table('new_table')
```

## Best Practices

### 1. Always Review Auto-generated Migrations

Auto-generated migrations aren't perfect. Always review and test them.

### 2. One Migration Per Logical Change

Keep migrations focused and atomic.

### 3. Test Both Upgrade and Downgrade

Ensure both directions work correctly.

### 4. Avoid Breaking Changes

- Don't drop columns with data
- Add new columns as nullable first
- Use data migrations for transformations

### 5. Data Migrations

For data changes, separate schema and data migrations:

```python
def upgrade() -> None:
    # First: Schema change
    op.add_column('users', sa.Column('full_name', sa.String(), nullable=True))
    
    # Then: Data migration
    conn = op.get_bind()
    conn.execute(
        "UPDATE users SET full_name = first_name || ' ' || last_name"
    )
    
    # Finally: Constraints
    op.alter_column('users', 'full_name', nullable=False)
```

### 6. Version Control

- Commit migration files to git
- Never modify existing migrations after they're deployed
- If you need changes, create a new migration

## Troubleshooting

### Multiple Heads

When multiple branches create migrations:

```bash
# List heads
alembic heads

# Merge them
alembic merge heads -m "merge migrations"

# Apply merged migration
alembic upgrade head
```

### Broken Migration

If a migration fails:

```bash
# Mark it as applied without running (use with caution)
alembic stamp head

# Or manually fix the database and retry
```

### Schema Out of Sync

If your database schema doesn't match models:

```bash
# Generate migration to sync
alembic revision --autogenerate -m "sync schema"

# Review and apply
alembic upgrade head
```

## Common Operations

### Adding a Table

```python
def upgrade():
    op.create_table(
        'new_table',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

def downgrade():
    op.drop_table('new_table')
```

### Adding a Column

```python
def upgrade():
    op.add_column('users', 
        sa.Column('phone', sa.String(20), nullable=True))

def downgrade():
    op.drop_column('users', 'phone')
```

### Modifying a Column

```python
def upgrade():
    op.alter_column('users', 'email',
        existing_type=sa.String(100),
        type_=sa.String(255),
        nullable=False)

def downgrade():
    op.alter_column('users', 'email',
        existing_type=sa.String(255),
        type_=sa.String(100),
        nullable=True)
```

### Adding an Index

```python
def upgrade():
    op.create_index('idx_users_email', 'users', ['email'])

def downgrade():
    op.drop_index('idx_users_email', 'users')
```

### Adding a Foreign Key

```python
def upgrade():
    op.create_foreign_key(
        'fk_posts_user_id',
        'posts', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )

def downgrade():
    op.drop_constraint('fk_posts_user_id', 'posts', type_='foreignkey')
```

## Additional Resources

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Types](https://docs.sqlalchemy.org/en/14/core/type_basics.html)
- [Alembic Operations](https://alembic.sqlalchemy.org/en/latest/ops.html)
