import { useState, type FormEvent } from 'react';
import { ApiError } from '../../services/apiClient';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CheckboxField,
  SelectField,
  TextField,
} from '../../components/ui';
import {
  EMPTY_CUSTOMER_FORM,
  toApiPayload,
  validateCustomerForm,
  type CustomerFormValues,
} from './customerForm.logic';

interface CustomerFormProps {
  initialValues?: CustomerFormValues;
  submitLabel: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function CustomerForm({ initialValues, submitLabel, onSubmit, onCancel }: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>(initialValues ?? EMPTY_CUSTOMER_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const text = (key: keyof CustomerFormValues) => (event: { target: { value: string } }) =>
    set(key, event.target.value as CustomerFormValues[typeof key]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const validationErrors = validateCustomerForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setFormError('Please correct the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(toApiPayload(values));
    } catch (error) {
      if (error instanceof ApiError) {
        // Server field paths ("vehicle.value") map onto the flat form keys.
        const mapped: Record<string, string> = {};
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          const key = field
            .replace('vehicle.value', 'vehicleValue')
            .replace('vehicle.type', 'vehicleType');
          mapped[key] = message;
        });
        setErrors(mapped);
        setFormError(
          error.details.length > 0 ? 'Please correct the highlighted fields.' : error.message,
        );
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Card>
        <CardHeader title="Personal details" />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="First name"
            value={values.firstName}
            onChange={text('firstName')}
            error={errors.firstName}
            required
          />
          <TextField
            label="Last name"
            value={values.lastName}
            onChange={text('lastName')}
            error={errors.lastName}
            required
          />
          <TextField
            label="Email"
            type="email"
            value={values.email}
            onChange={text('email')}
            error={errors.email}
            required
          />
          <TextField
            label="Phone"
            value={values.phone}
            onChange={text('phone')}
            error={errors.phone}
            hint="Include the country code — WhatsApp sharing needs it."
            placeholder="+919876543210"
            required
          />
          <TextField
            label="Date of birth"
            type="date"
            value={values.dateOfBirth}
            onChange={text('dateOfBirth')}
            error={errors.dateOfBirth}
            required
          />
          <SelectField
            label="Gender"
            value={values.gender}
            onChange={text('gender')}
            error={errors.gender}
            options={[
              { value: 'FEMALE', label: 'Female' },
              { value: 'MALE', label: 'Male' },
              { value: 'OTHER', label: 'Other' },
            ]}
            required
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Work and location"
          description="Used to decide which products the customer qualifies for."
        />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Occupation"
            value={values.occupation}
            onChange={text('occupation')}
            error={errors.occupation}
            required
          />
          <TextField
            label="Annual income"
            type="number"
            min={0}
            step={1000}
            prefix="₹"
            value={values.annualIncome}
            onChange={text('annualIncome')}
            error={errors.annualIncome}
            hint="Gross annual income in rupees."
            required
          />
          <TextField
            label="City"
            value={values.city}
            onChange={text('city')}
            error={errors.city}
            required
          />
          <TextField
            label="State"
            value={values.state}
            onChange={text('state')}
            error={errors.state}
            required
          />
          <TextField
            label="Postal code"
            value={values.postalCode}
            onChange={text('postalCode')}
            error={errors.postalCode}
            required
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Vehicle" description="Required for vehicle insurance eligibility." />
        <CardBody className="space-y-4">
          <CheckboxField
            label="This customer owns a vehicle"
            checked={values.ownsVehicle}
            onChange={(event) => set('ownsVehicle', event.target.checked)}
          />
          {values.ownsVehicle ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SelectField
                label="Vehicle type"
                value={values.vehicleType}
                onChange={text('vehicleType')}
                error={errors.vehicleType}
                options={[
                  { value: 'CAR', label: 'Car' },
                  { value: 'TWO_WHEELER', label: 'Two-wheeler' },
                  { value: 'COMMERCIAL', label: 'Commercial' },
                ]}
              />
              <TextField
                label="Declared value"
                type="number"
                min={0}
                step={1000}
                prefix="₹"
                value={values.vehicleValue}
                onChange={text('vehicleValue')}
                error={errors.vehicleValue}
              />
              <TextField
                label="Registration year"
                type="number"
                min={1950}
                max={new Date().getFullYear() + 1}
                value={values.registrationYear}
                onChange={text('registrationYear')}
                error={errors.registrationYear}
              />
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Declarations"
          description="Only the two declarations the pricing and eligibility rules actually use are collected."
        />
        <CardBody className="space-y-3">
          <CheckboxField
            label="Customer smokes"
            description="Applies a loading on life and health products."
            checked={values.smoker}
            onChange={(event) => set('smoker', event.target.checked)}
          />
          <CheckboxField
            label="Customer has declared pre-existing conditions"
            description="Excludes some health products and loads others."
            checked={values.preExistingConditions}
            onChange={(event) => set('preExistingConditions', event.target.checked)}
          />
        </CardBody>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
