ALTER TABLE profiles DISABLE TRIGGER protect_franquia_id_trigger;
UPDATE profiles SET franquia_id = 'a18278bd-0f91-4fc9-962e-d9cce163a281' WHERE user_id = '4418c0b9-afab-41a4-bd25-1e52031b81ba';
ALTER TABLE profiles ENABLE TRIGGER protect_franquia_id_trigger;