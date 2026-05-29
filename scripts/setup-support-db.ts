import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const run = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL missing from .env.local');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  console.log('🔄 Connecting to database and running support details & FAQs setup...');

  try {
    // 1. Create support_settings table
    console.log('⚡ Creating public.support_settings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.support_settings (
        id VARCHAR(50) PRIMARY KEY,
        phone VARCHAR(50) DEFAULT '(044) 761-0000' NOT NULL,
        email VARCHAR(255) DEFAULT 'cdrrmobaliwag@gmail.com' NOT NULL,
        address TEXT DEFAULT 'Baliwag Government Center, Brgy. Bagong Nayon, Baliwag City, Bulacan' NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 2. Create faqs table
    console.log('⚡ Creating public.faqs table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.faqs (
        id VARCHAR(255) PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        display_order INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 3. Seed support_settings
    console.log('🌱 Seeding support settings...');
    await sql`
      INSERT INTO public.support_settings (id, phone, email, address)
      VALUES (
        'current', 
        '(044) 761-0000', 
        'cdrrmobaliwag@gmail.com', 
        'Baliwag Government Center, Brgy. Bagong Nayon, Baliwag City, Bulacan'
      )
      ON CONFLICT (id) DO UPDATE SET
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        updated_at = NOW();
    `;

    // 4. Seed FAQs
    console.log('🌱 Seeding current FAQs...');
    const faqData = [
      {
        id: 'faq-1',
        question: "How do I report an emergency?",
        answer: "Go to the 'Reports' tab and tap 'Report Emergency'. Select the disaster type, capture or upload an image, add your location, and submit. CDRRMO will dispatch responders immediately.",
        display_order: 0
      },
      {
        id: 'faq-2',
        question: "Can I update my report after submitting?",
        answer: "Currently, submitted reports cannot be edited to ensure accurate timestamps. However, you can add comments or updates through the specific report's tracking page.",
        display_order: 1
      },
      {
        id: 'faq-3',
        question: "How do I know if a responder is coming?",
        answer: "You will receive push notifications when your report status changes to 'Responding'. You can also track the responder's unit and status in the tracking page.",
        display_order: 2
      },
      {
        id: 'faq-4',
        question: "What should I do if my location is wrong?",
        answer: "Make sure you have granted GPS/Location permissions to the DisasTRACE app in your phone's settings. For best accuracy, stay outdoors or near a window when pinning your location.",
        display_order: 3
      }
    ];

    for (const faq of faqData) {
      await sql`
        INSERT INTO public.faqs (id, question, answer, display_order)
        VALUES (${faq.id}, ${faq.question}, ${faq.answer}, ${faq.display_order})
        ON CONFLICT (id) DO UPDATE SET
          question = EXCLUDED.question,
          answer = EXCLUDED.answer,
          display_order = EXCLUDED.display_order;
      `;
    }

    console.log('✅ Support details and FAQs successfully initialized and seeded!');
  } catch (err) {
    console.error('❌ Failed to run support setup script:', err);
  } finally {
    await sql.end();
  }
};

run();
