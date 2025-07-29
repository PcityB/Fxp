import React, { useState } from 'react';

interface FormField {
  name: string;
  type: 'select' | 'number' | 'text' | 'checkbox';
  label: string;
  description?: string;
  required?: boolean;
  options?: Array<{
    value: string | number;
    label: string;
  }>;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string | number | boolean;
}

interface ParameterFormProps {
  schema: {
    fields: FormField[];
  };
  onSubmit: (params: Record<string, any>) => void;
  loading?: boolean;
}

const ParameterForm: React.FC<ParameterFormProps> = ({ schema, onSubmit, loading = false }) => {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initialData: Record<string, any> = {};
    schema.fields.forEach(field => {
      initialData[field.name] = field.defaultValue ?? '';
    });
    return initialData;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    schema.fields.forEach(field => {
      if (field.required && (formData[field.name] === '' || formData[field.name] === undefined)) {
        newErrors[field.name] = `${field.label} is required`;
      }
      
      if (field.type === 'number' && formData[field.name] !== '') {
        const value = Number(formData[field.name]);
        if (isNaN(value)) {
          newErrors[field.name] = `${field.label} must be a number`;
        } else if (field.min !== undefined && value < field.min) {
          newErrors[field.name] = `${field.label} must be at least ${field.min}`;
        } else if (field.max !== undefined && value > field.max) {
          newErrors[field.name] = `${field.label} must be at most ${field.max}`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      const processedData: Record<string, any> = {};
      
      schema.fields.forEach(field => {
        let value = formData[field.name];
        
        if (field.type === 'number' && value !== '') {
          value = Number(value);
        }
        
        processedData[field.name] = value;
      });
      
      onSubmit(processedData);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name];
    const error = errors[field.name];

    return (
      <div key={field.name} className="space-y-2">
        <label className="block text-sm font-medium text-text-primary">
          {field.label}
          {field.required && <span className="text-error-500 ml-1">*</span>}
        </label>
        
        {field.description && (
          <p className="text-xs text-text-secondary">{field.description}</p>
        )}
        
        {field.type === 'select' && field.options ? (
          <select
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          >
            <option value="">Select {field.label.toLowerCase()}</option>
            {field.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.type === 'number' ? (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            min={field.min}
            max={field.max}
            step={field.step}
            disabled={loading}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        ) : field.type === 'checkbox' ? (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => handleChange(field.name, e.target.checked)}
            disabled={loading}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-border rounded"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        )}
        
        {error && (
          <p className="text-sm text-error-500">{error}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {schema.fields.map(renderField)}
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing...' : 'Extract Patterns'}
      </button>
    </form>
  );
};

export default ParameterForm;
