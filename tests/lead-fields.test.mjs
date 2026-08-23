import assert from "node:assert/strict";
import test from "node:test";
import {
  findByKey,
  findContactEmail,
  findContactName,
  findContactPhone,
  normalizePhone,
} from "../worker/lead-fields.ts";

/**
 * The bug these pin: "hotelid" and "hotelname" both contain "tel", so a
 * substring search for the phone number picked up the hotel's id. Every
 * enquiry from a venue page -- 259 of them, two forms each -- was refused with
 * "Please enter a valid 10-digit Indian mobile number" whatever was typed.
 */
const hotelEnquiry = {
  hotel_id: "354",
  hotel_name: "Taj Fort Aguada Resort And Spa Goa",
  source_page: "/destination-wedding/goa/taj-fort-aguada-resort-and-spa-goa",
  name: "Asha Menon",
  email: "asha@example.com",
  number: "9876543210",
  message: "Looking at January dates.",
};

test("the hotel's id is not read as the visitor's phone number", () => {
  assert.equal(findContactPhone(hotelEnquiry), "9876543210");
  assert.equal(normalizePhone(findContactPhone(hotelEnquiry)), "+919876543210");
});

test("the hotel's name is not read as the visitor's name", () => {
  assert.equal(findContactName(hotelEnquiry), "Asha Menon");
});

test("the venue fields are still readable as themselves", () => {
  assert.equal(findByKey(hotelEnquiry, ["hotelname", "hotel"]), "Taj Fort Aguada Resort And Spa Goa");
});

test("an exact field name beats a longer one that merely contains it", () => {
  const fields = { hotel_name: "ITC Grand Goa", name: "Ravi Iyer" };
  assert.equal(findContactName(fields), "Ravi Iyer");
});

test("the forms' several spellings of the phone field all resolve", () => {
  for (const key of ["number", "phone", "mobile", "phone_number", "mobile_number", "tel"]) {
    assert.equal(findContactPhone({ [key]: "9876543210" }), "9876543210", key);
  }
});

test("an empty value is skipped in favour of one that was filled in", () => {
  assert.equal(findContactPhone({ phone: "", number: "9876543210" }), "9876543210");
});

test("a missing role reports nothing rather than guessing", () => {
  assert.equal(findContactEmail({ name: "Ravi", number: "9876543210" }), "");
});

test("normalizePhone accepts the shapes visitors type and refuses the rest", () => {
  assert.equal(normalizePhone("+91 98765 43210"), "+919876543210");
  assert.equal(normalizePhone("098765-43210"), "");
  assert.equal(normalizePhone("919876543210"), "+919876543210");
  assert.equal(normalizePhone("1234567890"), "");
  assert.equal(normalizePhone("354"), "");
});
