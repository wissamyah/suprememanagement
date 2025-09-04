import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { ProductCategory } from '../../types';
import { Trash2, Edit2, Plus } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ProductCategory[];
  onAddCategory: (name: string, description?: string) => { success: boolean };
  onUpdateCategory: (id: string, name: string, description?: string) => { success: boolean };
  onDeleteCategory: (id: string) => { success: boolean };
}

export const CategoryModal = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: CategoryModalProps) => {
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEditingCategory(null);
      setNewCategory({ name: '', description: '' });
      setIsAddingNew(false);
      setDeleteConfirm(null);
      setError('');
    }
  }, [isOpen]);

  const handleAddCategory = async () => {
    setError('');
    if (!newCategory.name.trim()) {
      setError('Category name is required');
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async operation
    const success = onAddCategory(newCategory.name.trim(), newCategory.description.trim());
    setLoading(false);
    
    if (success) {
      setNewCategory({ name: '', description: '' });
      setIsAddingNew(false);
    } else {
      setError('Failed to add category');
    }
  };

  const handleUpdateCategory = () => {
    if (!editingCategory) return;
    
    setError('');
    const name = (document.getElementById(`cat-name-${editingCategory.id}`) as HTMLInputElement)?.value;
    const description = (document.getElementById(`cat-desc-${editingCategory.id}`) as HTMLInputElement)?.value;

    if (!name?.trim()) {
      setError('Category name is required');
      return;
    }

    const success = onUpdateCategory(editingCategory.id, name.trim(), description?.trim());
    if (success) {
      setEditingCategory(null);
    } else {
      setError('Failed to update category');
    }
  };

  const handleDeleteCategory = (id: string) => {
    const success = onDeleteCategory(id);
    if (success) {
      setDeleteConfirm(null);
    } else {
      setError('Cannot delete category with existing products');
      setDeleteConfirm(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Categories"
      size="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <p className="text-muted">Manage product categories for your inventory</p>
          {!isAddingNew && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
              title="Add Category"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Category</span>
            </button>
          )}
        </div>

        {isAddingNew && (
          <div className="glass p-4 rounded-lg space-y-3">
            <h3 className="font-semibold">Add New Category</h3>
            <input
              type="text"
              placeholder="Category name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
            />
            <div className="flex gap-2">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleAddCategory}
                loading={loading}
                loadingText="Saving..."
                disabled={loading}
              >
                Save
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsAddingNew(false);
                  setNewCategory({ name: '', description: '' });
                  setError('');
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {categories.map((category) => (
            <div key={category.id} className="glass p-4 rounded-lg">
              {editingCategory?.id === category.id ? (
                <div className="space-y-2">
                  <input
                    id={`cat-name-${category.id}`}
                    type="text"
                    defaultValue={category.name}
                    className="w-full px-3 py-1 glass rounded focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <input
                    id={`cat-desc-${category.id}`}
                    type="text"
                    defaultValue={category.description}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-1 glass rounded focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
                  />
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={handleUpdateCategory}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingCategory(null);
                      setError('');
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : deleteConfirm === category.id ? (
                <div className="space-y-2">
                  <p className="text-yellow-400">Are you sure you want to delete this category?</p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    >
                      Delete
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{category.name}</h4>
                    {category.description && (
                      <p className="text-sm text-muted mt-1">{category.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCategory(category);
                        setError('');
                      }}
                      className="p-2 rounded-lg hover:bg-glass transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirm(category.id);
                        setError('');
                      }}
                      className="p-2 rounded-lg hover:bg-glass transition-colors text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};