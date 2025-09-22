const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('Missing environment variables. Please check your .env file.');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('Testing Supabase connection...');

  try {
    // Test with anon key (browser client equivalent)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✓ Supabase client created successfully');

    // Test basic query - try to select from a table that exists
    const { data, error } = await supabase.from('users').select('count').single();

    if (error) {
      console.error('✗ Database query failed:', error.message);
      if (error.message.includes('permission denied')) {
        console.log('Note: This might be expected if RLS is enabled and user is not authenticated');
      }
    } else {
      console.log('✓ Database connection verified');
    }

    // Test service role key for admin operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: adminData, error: adminError } = await adminSupabase.from('users').select('count').single();

    if (adminError) {
      console.error('✗ Admin database query failed:', adminError.message);
    } else {
      console.log('✓ Admin database connection verified');
    }

    console.log('Supabase connection test completed.');
  } catch (error) {
    console.error('✗ Unexpected error during Supabase test:', error.message);
    process.exit(1);
  }
}

testSupabaseConnection();