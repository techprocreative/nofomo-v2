'use client';

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useForm, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Trash2, Plus, GripVertical, Copy, Settings } from 'lucide-react';
import { useUIStateStore } from '../lib/stores/uiStateStore';

interface RuleFormData {
  name: string;
  conditions: Array<{
    id: string;
    field: string;
    operator: string;
    value: string;
    logic: 'AND' | 'OR';
  }>;
  actions: Array<{
    type: 'browser' | 'email' | 'sms' | 'sound';
    enabled: boolean;
    config?: any;
  }>;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
}

interface AlertRuleBuilderProps {
  ruleId?: string;
  onSave?: (rule: any) => void;
  onCancel?: () => void;
}

const FIELD_OPTIONS = [
  // Price fields
  { value: 'prices.{symbol}.bid', label: 'Bid Price', category: 'Price' },
  { value: 'prices.{symbol}.ask', label: 'Ask Price', category: 'Price' },
  { value: 'prices.{symbol}.spread', label: 'Spread', category: 'Price' },

  // Signal fields
  { value: 'signals.{index}.strength', label: 'Signal Strength', category: 'Signals' },
  { value: 'signals.{index}.direction', label: 'Signal Direction', category: 'Signals' },
  { value: 'signals.{index}.symbol', label: 'Signal Symbol', category: 'Signals' },

  // Position fields
  { value: 'positions.{index}.profit', label: 'Position Profit', category: 'Positions' },
  { value: 'positions.{index}.volume', label: 'Position Volume', category: 'Positions' },
  { value: 'positions.{index}.symbol', label: 'Position Symbol', category: 'Positions' },

  // Custom fields
  { value: 'custom.pnl_threshold', label: 'P&L Threshold', category: 'Custom' },
  { value: 'custom.risk_percentage', label: 'Risk Percentage', category: 'Custom' },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals (=)' },
  { value: 'not_equals', label: 'Not Equals (≠)' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'greater_equal', label: 'Greater or Equal (≥)' },
  { value: 'less_equal', label: 'Less or Equal (≤)' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
];

const RULE_TEMPLATES = [
  {
    name: 'High Risk Alert',
    description: 'Alert when position risk exceeds threshold',
    conditions: [
      { field: 'positions.{index}.profit', operator: 'less_than', value: '-100', logic: 'AND' as const },
    ],
    actions: [
      { type: 'browser' as const, enabled: true },
      { type: 'sound' as const, enabled: true },
    ],
    severity: 'critical' as const,
  },
  {
    name: 'Price Movement Alert',
    description: 'Alert on significant price changes',
    conditions: [
      { field: 'prices.{symbol}.bid', operator: 'greater_than', value: '1.05', logic: 'AND' as const },
    ],
    actions: [
      { type: 'browser' as const, enabled: true },
    ],
    severity: 'high' as const,
  },
  {
    name: 'Signal Strength Alert',
    description: 'Alert on strong trading signals',
    conditions: [
      { field: 'signals.{index}.strength', operator: 'greater_than', value: '0.8', logic: 'AND' as const },
    ],
    actions: [
      { type: 'browser' as const, enabled: true },
      { type: 'email' as const, enabled: false },
    ],
    severity: 'medium' as const,
  },
];

export function AlertRuleBuilder({ ruleId, onSave, onCancel }: AlertRuleBuilderProps) {
  const { notificationRules, addNotificationRule, updateNotificationRule } = useUIStateStore();
  const existingRule = ruleId ? notificationRules.find(r => r.id === ruleId) : null;

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<RuleFormData>({
    defaultValues: existingRule ? {
      name: existingRule.name,
      conditions: existingRule.conditions.map((c, index) => ({
        id: `condition-${index}`,
        ...c,
      })),
      actions: existingRule.actions,
      severity: existingRule.severity,
      enabled: existingRule.enabled,
    } : {
      name: '',
      conditions: [{ id: 'condition-0', field: '', operator: 'equals', value: '', logic: 'AND' }],
      actions: [
        { type: 'browser', enabled: true },
        { type: 'sound', enabled: true },
        { type: 'email', enabled: false },
        { type: 'sms', enabled: false },
      ],
      severity: 'medium',
      enabled: true,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'conditions',
  });

  const watchedConditions = watch('conditions');
  const watchedActions = watch('actions');

  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex !== destIndex) {
      move(sourceIndex, destIndex);
    }
  }, [move]);

  const addCondition = () => {
    append({
      id: `condition-${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      logic: 'AND',
    });
  };

  const removeCondition = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const duplicateCondition = (index: number) => {
    const condition = watchedConditions[index];
    if (condition) {
      append({
        ...condition,
        id: `condition-${Date.now()}`,
      });
    }
  };

  const applyTemplate = (template: typeof RULE_TEMPLATES[0]) => {
    setValue('name', template.name);
    setValue('conditions', template.conditions.map((c, index) => ({
      id: `condition-${index}`,
      ...c,
    })));
    setValue('actions', template.actions);
    setValue('severity', template.severity);
  };

  const onSubmit = (data: RuleFormData) => {
    const rule = {
      id: ruleId || `rule_${Date.now()}`,
      name: data.name,
      conditions: data.conditions.map(c => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
        logic: c.logic,
      })),
      actions: data.actions,
      severity: data.severity,
      enabled: data.enabled,
      createdAt: existingRule?.createdAt || new Date(),
      lastTriggered: existingRule?.lastTriggered,
    };

    if (existingRule) {
      updateNotificationRule(ruleId!, rule);
    } else {
      addNotificationRule(rule);
    }

    onSave?.(rule);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {existingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Rule Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Rule name is required' })}
                placeholder="Enter rule name"
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            {/* Templates */}
            {!existingRule && (
              <div className="space-y-2">
                <Label>Quick Templates</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {RULE_TEMPLATES.map((template, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template)}
                      className="text-left h-auto p-3"
                    >
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Conditions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Conditions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Condition
                </Button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="conditions">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {fields.map((field, index) => (
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                  <div {...provided.dragHandleProps} className="cursor-move">
                                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                                  </div>

                                  {index > 0 && (
                                    <Select
                                      value={watchedConditions[index]?.logic || 'AND'}
                                      onValueChange={(value: 'AND' | 'OR') => {
                                        setValue(`conditions.${index}.logic`, value);
                                      }}
                                    >
                                      <SelectTrigger className="w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="AND">AND</SelectItem>
                                        <SelectItem value="OR">OR</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}

                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <Select
                                      value={watchedConditions[index]?.field || ''}
                                      onValueChange={(value) => setValue(`conditions.${index}.field`, value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Field" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {FIELD_OPTIONS.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            <div>
                                              <div className="font-medium">{option.label}</div>
                                              <div className="text-xs text-muted-foreground">{option.category}</div>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <Select
                                      value={watchedConditions[index]?.operator || 'equals'}
                                      onValueChange={(value) => setValue(`conditions.${index}.operator`, value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Operator" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {OPERATOR_OPTIONS.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <Input
                                      placeholder="Value"
                                      value={watchedConditions[index]?.value || ''}
                                      onChange={(e) => setValue(`conditions.${index}.value`, e.target.value)}
                                    />

                                    <div className="flex gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => duplicateCondition(index)}
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeCondition(index)}
                                        disabled={fields.length === 1}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Notification Actions</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {watchedActions?.map((action, index) => (
                  <Card key={action.type} className="p-4">
                    <div className="flex items-center justify-between">
                      <Label className="capitalize">{action.type}</Label>
                      <Switch
                        checked={action.enabled}
                        onCheckedChange={(checked) => setValue(`actions.${index}.enabled`, checked)}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label>Severity Level</Label>
              <Select
                value={watch('severity')}
                onValueChange={(value: 'critical' | 'high' | 'medium' | 'low') => setValue('severity', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">
                    <Badge variant="destructive">Critical</Badge>
                  </SelectItem>
                  <SelectItem value="high">
                    <Badge variant="default">High</Badge>
                  </SelectItem>
                  <SelectItem value="medium">
                    <Badge variant="secondary">Medium</Badge>
                  </SelectItem>
                  <SelectItem value="low">
                    <Badge variant="outline">Low</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rule Preview */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Rule Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <strong>{watch('name') || 'Unnamed Rule'}</strong>
                  {watchedConditions?.length > 0 && (
                    <div className="mt-2">
                      When {watchedConditions.map((c, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-muted-foreground mx-2">{c.logic}</span>}
                          <Badge variant="outline" className="mx-1">
                            {FIELD_OPTIONS.find(f => f.value === c.field)?.label || c.field} {c.operator} {c.value}
                          </Badge>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 text-muted-foreground">
                    Actions: {watchedActions?.filter(a => a.enabled).map(a => a.type).join(', ') || 'None'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {existingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}