-- Demo user until Cognito auth lands (Milestone 1).
INSERT INTO users (id, cognito_sub, email, display_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo-sub',
    'divya@example.com',
    'Divya',
    'USER'
)
ON CONFLICT (id) DO NOTHING;
