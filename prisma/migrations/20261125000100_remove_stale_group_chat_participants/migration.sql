DELETE FROM conversation_participant AS p
USING conversation AS c
WHERE c.id = p.conversation_id
  AND c.is_group
  AND c.group_name LIKE 'GROUP:%'
  AND NOT EXISTS (
    SELECT 1 FROM group_member AS m
    WHERE c.group_name = 'GROUP:' || m.group_id AND m.graduate_id = p.graduate_id
  );
