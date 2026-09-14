import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { CreateCustomerPage } from './pages/CreateCustomerPage';
import { EditCustomerPage } from './pages/EditCustomerPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { QuotationDetailPage } from './pages/QuotationDetailPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { PaymentReturnPage } from './pages/PaymentReturnPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Three route groups:
 *   - public auth screens (login, signup)
 *   - public customer-facing screens (the Stripe return pages, reached from a
 *     WhatsApp link by someone with no account)
 *   - the agent dashboard, behind ProtectedRoute
 */
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route path="/payment/success" element={<PaymentReturnPage outcome="success" />} />
            <Route path="/payment/cancelled" element={<PaymentReturnPage outcome="cancelled" />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/new" element={<CreateCustomerPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/customers/:id/edit" element={<EditCustomerPage />} />
                <Route path="/quotations/:id" element={<QuotationDetailPage />} />
                <Route path="/policies" element={<PoliciesPage />} />
              </Route>
            </Route>

            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
