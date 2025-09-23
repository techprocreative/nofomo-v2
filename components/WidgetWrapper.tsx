import React, { useState } from 'react';
import { Settings, X, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useUIStateStore } from '../lib/stores/uiStateStore';

interface WidgetWrapperProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
}

export const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  id,
  title,
  children,
  onRemove,
  className = '',
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { updateWidget } = useUIStateStore();

  const handleConfigSave = (config: any) => {
    updateWidget(id, { config });
    setIsConfigOpen(false);
  };

  return (
    <Card className={`relative h-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 drag-handle" role="button" tabIndex={0} aria-label={`Drag handle for ${title}`}>
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
            <h3 className="text-sm font-medium">{title}</h3>
          </div>
          <div className="flex items-center space-x-1">
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Widget Configuration</DialogTitle>
                </DialogHeader>
                <WidgetConfigForm onSave={handleConfigSave} />
              </DialogContent>
            </Dialog>
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                onClick={onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
};

interface WidgetConfigFormProps {
  onSave: (config: any) => void;
}

const WidgetConfigForm: React.FC<WidgetConfigFormProps> = ({ onSave }) => {
  const [refreshRate, setRefreshRate] = useState(5000);
  const [visible, setVisible] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ refreshRate, visible });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="refreshRate">Refresh Rate (ms)</Label>
        <Input
          id="refreshRate"
          type="number"
          value={refreshRate}
          onChange={(e) => setRefreshRate(Number(e.target.value))}
          min={1000}
          max={60000}
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="visible"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
        />
        <Label htmlFor="visible">Visible</Label>
      </div>
      <Button type="submit" className="w-full">
        Save Configuration
      </Button>
    </form>
  );
};