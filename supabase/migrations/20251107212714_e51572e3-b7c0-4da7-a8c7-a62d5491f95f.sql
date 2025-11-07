-- Enable RLS on tables that don't have it enabled
alter table creator_payouts enable row level security;
alter table template_purchases enable row level security;
alter table user_wallets enable row level security;
alter table wallet_transactions enable row level security;

-- Add policies for creator_payouts
create policy "Creators can view their own payouts"
on creator_payouts
for select
to authenticated
using (auth.uid() = creator_id);

create policy "Admins can manage payouts"
on creator_payouts
for all
to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Add policies for template_purchases
create policy "Users can view their own purchases"
on template_purchases
for select
to authenticated
using (auth.uid() = buyer_id);

create policy "Creators can view purchases of their templates"
on template_purchases
for select
to authenticated
using (auth.uid() = creator_id);

create policy "System can insert purchases"
on template_purchases
for insert
to authenticated
with check (auth.uid() = buyer_id);

-- Add policies for user_wallets
create policy "Users can view their own wallet"
on user_wallets
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update their own wallet"
on user_wallets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Add policies for wallet_transactions
create policy "Users can view their own transactions"
on wallet_transactions
for select
to authenticated
using (auth.uid() = user_id);

create policy "System can insert transactions"
on wallet_transactions
for insert
to authenticated
with check (auth.uid() = user_id);