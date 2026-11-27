UPDATE conversation AS c
SET updated_at = activity.latest
FROM (
  SELECT conversation_id, MAX(created_at) AS latest
  FROM message
  WHERE NOT is_deleted
  GROUP BY conversation_id
) AS activity
WHERE c.id = activity.conversation_id AND c.updated_at < activity.latest;
