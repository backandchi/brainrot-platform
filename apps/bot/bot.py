import os
import asyncio
import logging
from datetime import datetime, timedelta
import aiohttp
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
    PreCheckoutQuery,
    LabeledPrice,
)
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID", "")
API_INTERNAL_URL = os.getenv("API_INTERNAL_URL", "http://localhost:3001")
WEB_APP_URL = os.getenv("WEB_APP_URL", "http://localhost:3000")

logging.basicConfig(level=logging.INFO)
bot = Bot(token=TOKEN)
dp = Dispatcher(storage=MemoryStorage())

# State machine for Admin entering VIP Server link
class AdminTradeState(StatesGroup):
    waiting_for_server_link = State()

# -------------------------------------------------------------
# COMMAND: /start
# -------------------------------------------------------------
@dp.message(CommandStart())
async def handle_start(message: types.Message):
    user_name = message.from_user.first_name or "O'yinchi"
    
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🎮 Brainrot Farm O'ynash",
                    web_app=WebAppInfo(url=WEB_APP_URL)
                )
            ],
            [
                InlineKeyboardButton(text="⭐ Stars bilan to'ldirish", callback_data="buy_stars"),
                InlineKeyboardButton(text="🎁 Bepul tangalar", callback_data="check_quests")
            ],
            [
                InlineKeyboardButton(text="📢 Rasmiy Kanal", url="https://t.me/FarmBrainrots_news"),
                InlineKeyboardButton(text="💬 Qo'llab-quvvatlash", url="https://t.me/brainrot_support")
            ]
        ]
    )

    welcome_text = (
        f"👋 <b>Assalomu alaykum, {user_name}!</b>\n\n"
        f"🧠 <b>Brainrot Farm</b> platformasiga xush kelibsiz!\n\n"
        f"Bu yerda siz:\n"
        f"• 📦 Qiziqarli keyslarni ochishingiz;\n"
        f"• 🚜 Shaxsiy Brainrot fermangizda passiv tanga ishlab topishingiz;\n"
        f"• 🚀 Raketa (Crash), Minalar va Upgrader o'yinlarida omadni sinashingiz;\n"
        f"• 🔁 Roblox'dagi Brainrotlaringizni depozit va withdraw qilishingiz mumkin!\n\n"
        f"<i>O'yinni boshlash uchun quyidagi tugmani bosing:</i>"
    )

    await message.answer(welcome_text, parse_mode="HTML", reply_markup=keyboard)


# -------------------------------------------------------------
# TELEGRAM STARS INVOICE (XTR)
# -------------------------------------------------------------
@dp.callback_query(F.data == "buy_stars")
async def handle_buy_stars(callback: types.CallbackQuery):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="⭐ 50 Stars (500 Coin)", callback_data="stars_50")],
            [InlineKeyboardButton(text="⭐ 100 Stars (1,000 Coin)", callback_data="stars_100")],
            [InlineKeyboardButton(text="⭐ 500 Stars (5,500 Coin + Bonus)", callback_data="stars_500")],
        ]
    )
    await callback.message.edit_text(
        "⭐ <b>Telegram Stars orqali tanga sotib olish:</b>\n\n"
        "1 Star = 10 O'yin tangasi (Coin)\n"
        "O'zingizga qulay paketni tanlang:",
        parse_mode="HTML",
        reply_markup=keyboard
    )

@dp.callback_query(F.data.startswith("stars_"))
async def create_stars_invoice(callback: types.CallbackQuery):
    stars_amount = int(callback.data.split("_")[1])
    coins_amount = stars_amount * 10
    if stars_amount >= 500:
        coins_amount += 500 # Extra 500 coin bonus

    prices = [LabeledPrice(label=f"{coins_amount} Brainrot Coins", amount=stars_amount)]

    await bot.send_invoice(
        chat_id=callback.from_user.id,
        title=f"{coins_amount} Brainrot Coins",
        description=f"Brainrot Farm hisobingizga {coins_amount} coin qo'shiladi",
        payload=f"stars_deposit_{callback.from_user.id}_{stars_amount}",
        currency="XTR",
        prices=prices,
        start_parameter="brainrot-stars-topup"
    )
    await callback.answer()

@dp.pre_checkout_query()
async def process_pre_checkout_query(pre_checkout_query: PreCheckoutQuery):
    await bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)

@dp.message(F.successful_payment)
async def process_successful_payment(message: types.Message):
    stars_paid = message.successful_payment.total_amount
    user_id = message.from_user.id

    # Notify API server to credit balance
    async with aiohttp.ClientSession() as session:
        try:
            await session.post(
                f"{API_INTERNAL_URL}/api/payments/stars/webhook",
                json={"telegramId": user_id, "starsAmount": stars_paid}
            )
        except Exception as e:
            logging.error(f"Error notifying API of Stars payment: {e}")

    await message.answer(
        f"✅ <b>To'lov muvaffaqiyatli qabul qilindi!</b>\n\n"
        f"Siz {stars_paid} Telegram Stars to'ladingiz. Hisobingizga {stars_paid * 10} coin qo'shildi!\n\n"
        f"O'yinga kirib tekshirishingiz mumkin 🎮",
        parse_mode="HTML"
    )


# -------------------------------------------------------------
# ADMIN TRADE NOTIFICATION & 5-MINUTE TIMER SYSTEM
# -------------------------------------------------------------
async def notify_admin_new_trade(trade_data: dict):
    """
    Called when a user requests Deposit or Withdraw
    """
    if not ADMIN_CHAT_ID:
        return

    trade_id = trade_data.get("id")
    trade_type = trade_data.get("type")
    roblox_nick = trade_data.get("robloxUsername")
    tg_user = trade_data.get("user", {})
    tg_nick = tg_user.get("username", "Mavjud emas")

    text = (
        f"🔔 <b>YANGI {trade_type} SO'ROVI!</b>\n\n"
        f"👤 <b>Telegram:</b> @{tg_nick} (ID: {tg_user.get('telegramId')})\n"
        f"🎮 <b>Roblox Niki:</b> <code>{roblox_nick}</code>\n"
        f"🆔 <b>Trade ID:</b> <code>{trade_id}</code>\n\n"
        f"<i>Iltimos, Roblox server havolasini yuboring:</i>"
    )

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✅ Qabul qilish (Link berish)",
                    callback_data=f"adm_approve_{trade_id}"
                ),
                InlineKeyboardButton(
                    text="❌ Bekor qilish",
                    callback_data=f"adm_cancel_{trade_id}"
                )
            ]
        ]
    )

    await bot.send_message(chat_id=ADMIN_CHAT_ID, text=text, parse_mode="HTML", reply_markup=keyboard)


@dp.callback_query(F.data.startswith("adm_approve_"))
async def admin_start_approval(callback: types.CallbackQuery, state: FSMContext):
    trade_id = callback.data.replace("adm_approve_", "")
    await state.update_data(trade_id=trade_id)
    await state.set_state(AdminTradeState.waiting_for_server_link)

    await callback.message.reply(
        f"🔗 <b>Roblox VIP Server havolasini yuboring:</b>\n"
        f"<i>(Havolani kiritishingiz bilan foydalanuvchida 5 daqiqalik taymer ishga tushadi)</i>",
        parse_mode="HTML"
    )
    await callback.answer()


@dp.message(AdminTradeState.waiting_for_server_link)
async def admin_submit_link(message: types.Message, state: FSMContext):
    server_link = message.text.strip()
    data = await state.get_data()
    trade_id = data.get("trade_id")
    await state.clear()

    # Call API to set approved & 5-minute expiry
    async with aiohttp.ClientSession() as session:
        try:
            res = await session.post(
                f"{API_INTERNAL_URL}/api/trades/admin/{trade_id}/approve",
                json={"serverLink": server_link}
            )
            trade_res = await res.json()
            user_tg_id = trade_res.get("trade", {}).get("user", {}).get("telegramId")

            # Alert player with 5-minute live timer!
            if user_tg_id:
                player_msg = (
                    f"🟢 <b>TREYD QABUL QILINDI!</b>\n\n"
                    f"Admin Roblox serverida sizni kutmoqda.\n"
                    f"⏳ <b>Serverga kirish uchun sizga 5 DAQIQA berildi!</b>\n\n"
                    f"👉 <a href='{server_link}'>ROBLOX SERVERGA KIRISH</a>\n\n"
                    f"⚠️ <i>5 daqiqa ichida kirmasangiz, havola yopiladi va qayta so'rov 1 soatga bloklanadi!</i>"
                )
                await bot.send_message(chat_id=int(user_tg_id), text=player_msg, parse_mode="HTML")

            # Interactive admin completion button
            complete_kb = InlineKeyboardMarkup(
                inline_keyboard=[
                    [InlineKeyboardButton(text="🎯 Treyd topshirildi (Yakunlash)", callback_data=f"adm_done_{trade_id}")]
                ]
            )
            await message.reply(
                "✅ <b>Havola o'yinchiga yuborildi!</b>\n5 daqiqalik taymer ketmoqda.\nO'yinda treydni olgach/bergach pastdagi tugmani bosing:",
                parse_mode="HTML",
                reply_markup=complete_kb
            )

        except Exception as e:
            await message.reply(f"Xatolik yuz berdi: {e}")


@dp.callback_query(F.data.startswith("adm_done_"))
async def admin_finalize_trade(callback: types.CallbackQuery):
    trade_id = callback.data.replace("adm_done_", "")
    async with aiohttp.ClientSession() as session:
        try:
            await session.post(f"{API_INTERNAL_URL}/api/trades/admin/{trade_id}/complete")
            await callback.message.edit_text("🎉 <b>Treyd muvaffaqiyatli yakunlandi va balans yangilandi!</b>", parse_mode="HTML")
        except Exception as e:
            await callback.answer(f"Xato: {e}", show_alert=True)


async def main():
    logging.info("Starting Brainrot Telegram Bot...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
