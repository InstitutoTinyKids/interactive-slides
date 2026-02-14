import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jbrtlvelcjqqahbewcvy.supabase.co'
const supabaseAnonKey = 'sb_publishable_woPfnODWQmCe0T3vtZTv_A_t9Ya8NlW'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
    console.log('Checking projects...');
    const { data, error } = await supabase.from('projects').select('*').limit(1);
    if (error) {
        console.error('Error fetching projects:', error.message);
    } else {
        console.log('Projects table exists. Columns:', Object.keys(data[0] || {}));
    }

    console.log('Checking folders...');
    const { data: fData, error: fError } = await supabase.from('folders').select('*').limit(1);
    if (fError) {
        console.error('Error fetching folders:', fError.message);
    } else {
        console.log('Folders table exists.');
    }
}

check();
