import assert from "node:assert/strict";
import test from "node:test";
import { visibleContact } from "./contact-privacy";

for (const showEmail of [true, false]) {
  for (const showPhone of [true, false]) {
    test(`visible contact with showEmail=${showEmail} and showPhone=${showPhone}`, () => {
      const user = { email: "member@example.org", phone: "123", image: "avatar" };
      assert.deepEqual(visibleContact({ id: "member", showEmail, showPhone, user }), {
        id: "member",
        user: { email: showEmail ? user.email : null, phone: showPhone ? user.phone : null, image: "avatar" },
      });
    });
  }
}
