const BOT_TOKEN = '8719597880:AAGEjzdCn4JKUnnV2iKUnyzmQB2_kfJve4g';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function check() {
  const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=-10`);
  const json = await res.json();
  console.log('Recent Updates Count:', json.result?.length);
  for (const u of (json.result || [])) {
    console.log(`Update ID: ${u.update_id}`);
    if (u.message) {
      console.log(`  Message ID: ${u.message.message_id}, from: ${u.message.from?.first_name} (${u.message.from?.id})`);
      console.log(`  Text: ${u.message.text}`);
      console.log(`  Has Photo: ${!!u.message.photo}, Caption: ${u.message.caption}`);
    }
    if (u.callback_query) {
      console.log(`  Callback Query: ${u.callback_query.data}, from: ${u.callback_query.from?.first_name}`);
    }
  }
}

check();
