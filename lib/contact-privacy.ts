export function visibleContact<T extends {
  showEmail: boolean;
  showPhone: boolean;
  user: { email: string | null; phone: string | null };
}>({ showEmail, showPhone, user, ...graduate }: T) {
  return {
    ...graduate,
    user: { ...user, email: showEmail ? user.email : null, phone: showPhone ? user.phone : null },
  };
}
