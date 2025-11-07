-- Add RLS policies for memorials table
-- Users can manage their own memorials
create policy "Users can manage their own memorials"
on memorials
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Note: There's already a policy "Anyone can view all memorials" which allows public viewing