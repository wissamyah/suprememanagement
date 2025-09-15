import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Truck,
  AlertCircle,
  Calendar,
  User,
  FileText,
  Weight,
  Droplets,
  DollarSign,
  UserCheck,
  Package
} from 'lucide-react';
import { useSuppliers } from '../../hooks/useSuppliers';
import { calculateWeightAfterDeduction } from '../../utils/paddyTrucks';
import type { PaddyTruck } from '../../types';

interface EditPaddyTruckModalProps {
  isOpen: boolean;
  truck: PaddyTruck | null;
  onClose: () => void;
  onUpdate: (
    id: string,
    updates: Partial<Omit<PaddyTruck, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<{ success: boolean; errors?: string[] }> | { success: boolean; errors?: string[] };
}

export const EditPaddyTruckModal = ({ isOpen, truck, onClose, onUpdate }: EditPaddyTruckModalProps) => {
  const { suppliers } = useSuppliers();
  
  // Form state
  const [date, setDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [waybillNumber, setWaybillNumber] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [bags, setBags] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [deduction, setDeduction] = useState('');
  const [moistureLevel, setMoistureLevel] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [agent, setAgent] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load truck data when modal opens or truck changes
  useEffect(() => {
    if (truck) {
      setDate(new Date(truck.date).toISOString().split('T')[0]);
      setSupplierId(truck.supplierId);
      setWaybillNumber(truck.waybillNumber || '');
      setTruckPlate(truck.truckPlate);
      setBags(truck.bags?.toString() || '');
      setNetWeight(truck.netWeight?.toString() || '');
      setDeduction(truck.deduction?.toString() || '');
      setMoistureLevel(truck.moistureLevel.toString());
      setPricePerKg(truck.pricePerKg.toString());
      setAgent(truck.agent || '');
    }
  }, [truck]);
  
  // Calculate weight after deduction
  const weightAfterDeduction = calculateWeightAfterDeduction(
    netWeight ? parseFloat(netWeight) : undefined,
    deduction ? parseFloat(deduction) : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!truck) return;
    
    setErrors([]);
    setIsSubmitting(true);

    // Validation
    const validationErrors: string[] = [];
    
    if (!date) {
      validationErrors.push('Date is required');
    }
    
    if (!supplierId) {
      validationErrors.push('Supplier is required');
    }
    
    if (!truckPlate.trim()) {
      validationErrors.push('Truck plate number is required');
    }
    
    if (!moistureLevel || parseFloat(moistureLevel) < 0 || parseFloat(moistureLevel) > 100) {
      validationErrors.push('Moisture level must be between 0 and 100%');
    }
    
    if (!pricePerKg || parseFloat(pricePerKg) <= 0) {
      validationErrors.push('Price per kg must be greater than 0');
    }
    
    // Agent is now optional, no validation needed
    
    if (netWeight && parseFloat(netWeight) < 0) {
      validationErrors.push('Net weight cannot be negative');
    }
    
    if (deduction && parseFloat(deduction) < 0) {
      validationErrors.push('Deduction cannot be negative');
    }

    if (deduction && netWeight && parseFloat(deduction) > parseFloat(netWeight)) {
      validationErrors.push('Deduction cannot be greater than net weight');
    }

    if (bags && parseFloat(bags) < 0) {
      validationErrors.push('Number of bags cannot be negative');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    // Get supplier name
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) {
      setErrors(['Selected supplier not found']);
      setIsSubmitting(false);
      return;
    }

    // Calculate weight after deduction and total amount for the update
    const calculatedNetWeight = netWeight ? parseFloat(netWeight) : undefined;
    const calculatedDeduction = deduction ? parseFloat(deduction) : undefined;
    const calculatedWeightAfterDeduction = (calculatedNetWeight || 0) - (calculatedDeduction || 0);
    const calculatedTotalAmount = calculatedWeightAfterDeduction * parseFloat(pricePerKg);
    
    // Update paddy truck with calculated values
    const result = await onUpdate(truck.id, {
      date: new Date(date),
      supplierId,
      supplierName: supplier.name,
      truckPlate: truckPlate.trim(),
      pricePerKg: parseFloat(pricePerKg),
      agent: agent.trim(),
      moistureLevel: parseFloat(moistureLevel),
      waybillNumber: waybillNumber.trim() || undefined,
      bags: bags ? parseFloat(bags) : undefined,
      netWeight: calculatedNetWeight,
      deduction: calculatedDeduction,
      weightAfterDeduction: calculatedWeightAfterDeduction,
      totalAmount: calculatedTotalAmount
    });
    
    if (result.success) {
      handleClose();
    } else {
      setErrors(result.errors || ['Failed to update paddy truck']);
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setErrors([]);
    onClose();
  };

  if (!truck) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Paddy Truck"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            loadingText="Saving Changes..."
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-red-400 mt-0.5" size={16} />
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-400">{error}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Date <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                required
              />
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Supplier <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none"
                required
              >
                <option value="">Select a supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Truck Plate */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Truck Plate <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
              <input
                type="text"
                value={truckPlate}
                onChange={(e) => setTruckPlate(e.target.value.toUpperCase())}
                placeholder="e.g., ABC-123-XY"
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                required
              />
            </div>
          </div>

          {/* Waybill Number */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Waybill Number
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
              <input
                type="text"
                value={waybillNumber}
                onChange={(e) => setWaybillNumber(e.target.value)}
                placeholder="Optional"
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>

          {/* Number of Bags */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of Bags
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
              <input
                type="number"
                value={bags}
                onChange={(e) => setBags(e.target.value)}
                placeholder="Optional"
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                min="0"
                step="1"
              />
            </div>
          </div>

          {/* Net Weight */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Net Weight (kg)
            </label>
            <div className="relative">
              <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
              <input
                type="number"
                value={netWeight}
                onChange={(e) => setNetWeight(e.target.value)}
                placeholder="Optional"
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Deduction */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Deduction (kg)
            </label>
            <div className="relative">
              <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
              <input
                type="number"
                value={deduction}
                onChange={(e) => setDeduction(e.target.value)}
                placeholder="Optional"
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Weight After Deduction (Auto-calculated) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Weight After Deduction (kg)
            </label>
            <div className="relative">
              <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
              <input
                type="text"
                value={weightAfterDeduction.toFixed(2)}
                readOnly
                className="w-full pl-10 pr-4 py-2 glass rounded-lg bg-white/5 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-muted mt-1">Auto-calculated</p>
          </div>

          {/* Moisture Level */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Moisture Level (%) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Droplets className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
              <input
                type="number"
                value={moistureLevel}
                onChange={(e) => setMoistureLevel(e.target.value)}
                placeholder="e.g., 12.5"
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                step="0.1"
                min="0"
                max="100"
                required
              />
            </div>
          </div>

          {/* Price per Kg */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Price per Kg (₦) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
              <input
                type="number"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                placeholder="e.g., 250"
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          {/* Agent */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Agent
            </label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
              <input
                type="text"
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                placeholder="Optional"
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>
        </div>

        {/* Total Amount Display */}
        {weightAfterDeduction > 0 && pricePerKg && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-300">
              Total Amount: <span className="font-bold text-lg">
                ₦{(weightAfterDeduction * parseFloat(pricePerKg)).toLocaleString()}
              </span>
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
};