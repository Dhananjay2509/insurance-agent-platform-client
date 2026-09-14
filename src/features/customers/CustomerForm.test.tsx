import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerForm } from './CustomerForm';
import {
  toApiPayload,
  validateCustomerForm,
  type CustomerFormValues,
} from './customerForm.logic';

const valid: CustomerFormValues = {
  firstName: 'Ananya',
  lastName: 'Sharma',
  email: 'ananya@example.com',
  phone: '+919876543210',
  dateOfBirth: '1994-01-15',
  gender: 'FEMALE',
  occupation: 'Software Engineer',
  annualIncome: '1200000',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560034',
  ownsVehicle: false,
  vehicleType: 'CAR',
  vehicleValue: '',
  registrationYear: '',
  smoker: false,
  preExistingConditions: false,
};

describe('validateCustomerForm', () => {
  it('accepts a complete, valid customer', () => {
    expect(validateCustomerForm(valid)).toEqual({});
  });

  it('requires a country code on the phone number so WhatsApp links resolve', () => {
    expect(validateCustomerForm({ ...valid, phone: '9876543210' }).phone).toBeUndefined();
    expect(validateCustomerForm({ ...valid, phone: '12345' }).phone).toMatch(/country code/i);
    expect(validateCustomerForm({ ...valid, phone: '+0123456789' }).phone).toMatch(/country code/i);
  });

  it('rejects a malformed email', () => {
    expect(validateCustomerForm({ ...valid, email: 'ananya@' }).email).toBeDefined();
    expect(validateCustomerForm({ ...valid, email: 'ananya.example.com' }).email).toBeDefined();
  });

  it('rejects a customer under 18', () => {
    const sixteen = new Date();
    sixteen.setFullYear(sixteen.getFullYear() - 16);
    expect(
      validateCustomerForm({ ...valid, dateOfBirth: sixteen.toISOString().slice(0, 10) }).dateOfBirth,
    ).toMatch(/between 18 and 100/);
  });

  it('requires vehicle details only when the customer owns a vehicle', () => {
    expect(validateCustomerForm({ ...valid, ownsVehicle: false }).vehicleValue).toBeUndefined();

    const errors = validateCustomerForm({ ...valid, ownsVehicle: true, vehicleValue: '' });
    expect(errors.vehicleValue).toBeDefined();
  });

  it('rejects a negative or non-numeric income', () => {
    expect(validateCustomerForm({ ...valid, annualIncome: '-5' }).annualIncome).toBeDefined();
    expect(validateCustomerForm({ ...valid, annualIncome: 'abc' }).annualIncome).toBeDefined();
    expect(validateCustomerForm({ ...valid, annualIncome: '' }).annualIncome).toBeDefined();
  });
});

describe('toApiPayload', () => {
  it('converts rupee inputs to minor units', () => {
    const payload = toApiPayload(valid);
    expect(payload.annualIncome).toBe(120_000_000);
  });

  it('strips vehicle details when the customer does not own a vehicle', () => {
    const payload = toApiPayload({ ...valid, ownsVehicle: false, vehicleValue: '900000' });
    expect(payload.vehicle).toEqual({ owns: false });
  });

  it('includes vehicle details in minor units when owned', () => {
    const payload = toApiPayload({
      ...valid,
      ownsVehicle: true,
      vehicleType: 'CAR',
      vehicleValue: '900000',
      registrationYear: '2021',
    });
    expect(payload.vehicle).toEqual({
      owns: true,
      type: 'CAR',
      value: 90_000_000,
      registrationYear: 2021,
    });
  });
});

describe('<CustomerForm />', () => {
  it('blocks submission and shows field errors when required fields are empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<CustomerForm submitLabel="Create customer" onSubmit={onSubmit} onCancel={() => {}} />);
    await user.click(screen.getByRole('button', { name: /create customer/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/please correct the highlighted fields/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Enter a first name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('reveals vehicle fields only after the agent ticks "owns a vehicle"', async () => {
    const user = userEvent.setup();
    render(<CustomerForm submitLabel="Create customer" onSubmit={vi.fn()} onCancel={() => {}} />);

    expect(screen.queryByLabelText(/declared value/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/this customer owns a vehicle/i));

    expect(screen.getByLabelText(/declared value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vehicle type/i)).toBeInTheDocument();
  });

  it('submits a correctly shaped payload for a valid form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CustomerForm
        initialValues={valid}
        submitLabel="Create customer"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /create customer/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      firstName: 'Ananya',
      email: 'ananya@example.com',
      annualIncome: 120_000_000,
      vehicle: { owns: false },
      health: { smoker: false, preExistingConditions: false },
    });
  });
});
