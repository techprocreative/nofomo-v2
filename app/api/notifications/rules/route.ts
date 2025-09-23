import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { useUIStateStore } from '@/lib/stores/uiStateStore';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schemas
const NotificationRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Rule name is required'),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
    logic: z.enum(['AND', 'OR']).optional(),
  })).min(1, 'At least one condition is required'),
  actions: z.array(z.object({
    type: z.enum(['browser', 'email', 'sms', 'sound']),
    enabled: z.boolean(),
    config: z.any().optional(),
  })),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  enabled: z.boolean().optional().default(true),
});

const QuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  enabled: z.string().optional(),
  severity: z.string().optional(),
});

async function getRulesHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = QuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      enabled: searchParams.get('enabled'),
      severity: searchParams.get('severity'),
    });

    const page = parseInt(query.page);
    const limit = parseInt(query.limit);
    const offset = (page - 1) * limit;

    const store = useUIStateStore.getState();
    let rules = [...store.notificationRules];

    // Apply filters
    if (query.enabled !== undefined) {
      const enabled = query.enabled === 'true';
      rules = rules.filter(rule => rule.enabled === enabled);
    }

    if (query.severity && query.severity !== 'all') {
      rules = rules.filter(rule => rule.severity === query.severity);
    }

    // Apply pagination
    const total = rules.length;
    const paginatedRules = rules.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedRules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching notification rules:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch notification rules',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function createRuleHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const ruleData = NotificationRuleSchema.parse(body);

    const store = useUIStateStore.getState();

    // Check for duplicate names
    const existingRule = store.notificationRules.find(
      rule => rule.name.toLowerCase() === ruleData.name.toLowerCase()
    );

    if (existingRule) {
      return NextResponse.json(
        {
          success: false,
          message: 'A rule with this name already exists',
        },
        { status: 409 }
      );
    }

    // Create new rule
    const newRule = {
      ...ruleData,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      lastTriggered: undefined,
    };

    store.addNotificationRule(newRule);

    return NextResponse.json({
      success: true,
      data: newRule,
      message: 'Notification rule created successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification rule:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid rule data',
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create notification rule',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function updateRuleHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const ruleData = NotificationRuleSchema.parse(body);

    if (!ruleData.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Rule ID is required for updates',
        },
        { status: 400 }
      );
    }

    const store = useUIStateStore.getState();
    const existingRule = store.notificationRules.find(rule => rule.id === ruleData.id);

    if (!existingRule) {
      return NextResponse.json(
        {
          success: false,
          message: 'Notification rule not found',
        },
        { status: 404 }
      );
    }

    // Check for name conflicts (excluding current rule)
    const nameConflict = store.notificationRules.find(
      rule => rule.id !== ruleData.id && rule.name.toLowerCase() === ruleData.name.toLowerCase()
    );

    if (nameConflict) {
      return NextResponse.json(
        {
          success: false,
          message: 'A rule with this name already exists',
        },
        { status: 409 }
      );
    }

    // Update rule
    const updatedRule = {
      ...ruleData,
      id: ruleData.id,
      createdAt: existingRule.createdAt,
      lastTriggered: existingRule.lastTriggered,
    };

    store.updateNotificationRule(ruleData.id, updatedRule);

    return NextResponse.json({
      success: true,
      data: updatedRule,
      message: 'Notification rule updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating notification rule:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid rule data',
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update notification rule',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getRulesHandler);
export const POST = withAuth(createRuleHandler);
export const PUT = withAuth(updateRuleHandler);