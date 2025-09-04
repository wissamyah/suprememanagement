import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { CustomerList } from './pages/customers/CustomerList';
import { Sales } from './pages/customers/Sales';
import { Loadings } from './pages/customers/Loadings';
import { CustomerLedger } from './pages/customers/CustomerLedger';
import { SupplierList } from './pages/suppliers/SupplierList';
import { PaddyTrucks } from './pages/suppliers/PaddyTrucks';
import { SupplierLedger } from './pages/suppliers/SupplierLedger';
import { Reports } from './pages/Reports';

function App() {
  return (
    <BrowserRouter basename="/suprememanagement">
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/sales" element={<Sales />} />
          <Route path="customers/loadings" element={<Loadings />} />
          <Route path="customers/ledger" element={<CustomerLedger />} />
          <Route path="suppliers" element={<SupplierList />} />
          <Route path="suppliers/paddy-trucks" element={<PaddyTrucks />} />
          <Route path="suppliers/ledger" element={<SupplierLedger />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;