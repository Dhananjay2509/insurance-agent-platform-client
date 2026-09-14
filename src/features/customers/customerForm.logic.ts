/**
 * Pure form logic for the customer form: shape, defaults, validation and the
 * API payload mapping.
 *
 * Kept out of the component file so it can be imported and unit-tested without
 * rendering anything, and so the component module exports only components.
 */
import { toMajorUnits, toMinorUnits } from '../../utils/format';
import type { Customer } from '../../types/api';

export interface CustomerFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  occupation: string;
  /** Rupees as typed by the agent; converted to paise on submit. */
  annualIncome: string;
  city: string;
  state: string;
  postalCode: string;
  ownsVehicle: boolean;
  vehicleType: string;
  vehicleValue: string;
  registrationYear: string;
  smoker: boolean;
  preExistingConditions: boolean;
}

export const EMPTY_CUSTOMER_FORM: CustomerFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: 'FEMALE',
  occupation: '',
  annualIncome: '',
  city: '',
  state: '',
  postalCode: '',
  ownsVehicle: false,
  vehicleType: 'CAR',
  vehicleValue: '',
  registrationYear: '',
  smoker: false,
  preExistingConditions: false,
};

export function toFormValues(customer: Customer): CustomerFormValues {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    dateOfBirth: customer.dateOfBirth.slice(0, 10),
    gender: customer.gender,
    occupation: customer.occupation,
    annualIncome: String(toMajorUnits(customer.annualIncome)),
    city: customer.city,
    state: customer.state,
    postalCode: customer.postalCode,
    ownsVehicle: customer.vehicle.owns,
    vehicleType: customer.vehicle.type ?? 'CAR',
    vehicleValue: customer.vehicle.value ? String(toMajorUnits(customer.vehicle.value)) : '',
    registrationYear: customer.vehicle.registrationYear
      ? String(customer.vehicle.registrationYear)
      : '',
    smoker: customer.health.smoker,
    preExistingConditions: customer.health.preExistingConditions,
  };
}

const MIN_AGE = 18;
const MAX_AGE = 100;
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

function ageFrom(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

/**
 * Client-side validation mirrors the server's zod schema. It exists for fast
 * feedback, not for safety — the API re-validates everything and is the only
 * thing standing between a crafted request and the database.
 */
export function validateCustomerForm(values: CustomerFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (values.firstName.trim().length < 2) errors.firstName = 'Enter a first name.';
  if (values.lastName.trim().length < 2) errors.lastName = 'Enter a last name.';
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (!PHONE_PATTERN.test(values.phone.trim())) {
    errors.phone = 'Include the country code, e.g. +919876543210.';
  }

  if (!values.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required.';
  } else {
    const age = ageFrom(values.dateOfBirth);
    if (Number.isNaN(age)) errors.dateOfBirth = 'Enter a valid date.';
    else if (age < MIN_AGE || age > MAX_AGE) {
      errors.dateOfBirth = `Customer must be between ${MIN_AGE} and ${MAX_AGE} years old.`;
    }
  }

  if (values.occupation.trim().length < 2) errors.occupation = 'Enter an occupation.';

  const income = Number(values.annualIncome);
  if (values.annualIncome === '' || Number.isNaN(income) || income < 0) {
    errors.annualIncome = 'Enter the annual income in rupees.';
  }

  if (values.city.trim().length < 2) errors.city = 'Enter a city.';
  if (values.state.trim().length < 2) errors.state = 'Enter a state.';
  if (!/^[A-Za-z0-9\s-]{4,12}$/.test(values.postalCode.trim())) {
    errors.postalCode = 'Enter a valid postal code.';
  }

  if (values.ownsVehicle) {
    const value = Number(values.vehicleValue);
    if (values.vehicleValue === '' || Number.isNaN(value) || value <= 0) {
      errors.vehicleValue = 'Enter the vehicle value in rupees.';
    }
    if (!values.vehicleType) errors.vehicleType = 'Select a vehicle type.';
  }

  return errors;
}

/** Shapes the form into the API payload: money to minor units, vehicle cleared
 *  when not owned so no stale data reaches the eligibility engine. */
export function toApiPayload(values: CustomerFormValues): Record<string, unknown> {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    occupation: values.occupation.trim(),
    annualIncome: toMinorUnits(Number(values.annualIncome)),
    city: values.city.trim(),
    state: values.state.trim(),
    postalCode: values.postalCode.trim(),
    vehicle: values.ownsVehicle
      ? {
          owns: true,
          type: values.vehicleType,
          value: toMinorUnits(Number(values.vehicleValue)),
          ...(values.registrationYear ? { registrationYear: Number(values.registrationYear) } : {}),
        }
      : { owns: false },
    health: {
      smoker: values.smoker,
      preExistingConditions: values.preExistingConditions,
    },
  };
}
