'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'cases' | 'trades'>('items');

  // Items State
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    slug: '',
    rarity: 'COMMON',
    priceCoins: 50,
    yieldPerHour: 2.0,
    imageUrl: '/pets/',
    glowColor: '#eab308', // Gold default
  });

  // Cases State
  const [newCase, setNewCase] = useState({
    name: '',
    slug: '',
    category: 'thematic',
    priceCoins: 100,
    imageUrl: '/cases/',
    rtpPercentage: 95.0,
  });

  // Trades State
  const [trades, setTrades] = useState<any[]>([]);
  const [serverLinkInput, setServerLinkInput] = useState<{ [tradeId: string]: string }>({});

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchItems();
    fetchPendingTrades();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/items`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setItems(res.data);
    } catch (e) {}
  };

  const fetchPendingTrades = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/trades/pending`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTrades(res.data);
    } catch (e) {}
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/items`, newItem, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      alert('Brainrot personaji muvaffaqiyatli qo\'shildi!');
      fetchItems();
    } catch (err: any) {
      alert('Xatolik: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleApproveTrade = async (tradeId: string) => {
    const link = serverLinkInput[tradeId];
    if (!link) {
      alert('Iltimos, Roblox VIP server havolasini kiriting!');
      return;
    }
    try {
      await axios.post(
        `${API_URL}/api/trades/admin/${tradeId}/approve`,
        { serverLink: link },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      alert('Tasdiqlandi! Foydalanuvchida 5 daqiqalik taymer ishga tushdi.');
      fetchPendingTrades();
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleCompleteTrade = async (tradeId: string) => {
    try {
      await axios.post(
        `${API_URL}/api/trades/admin/${tradeId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      alert('Treyd muvaffaqiyatli yakunlandi va balansga o\'tkazildi!');
      fetchPendingTrades();
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0a14] text-white p-6 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">⚡ Brainrot Farm Admin Panel</h1>
          <p className="text-sm text-gray-400">Keyslar, Personajlar va Treydlarni boshqarish</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'items' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'
            }`}
          >
            🧠 Brainrotlar
          </button>
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'cases' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'
            }`}
          >
            📦 Yangi Keys
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'trades' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'
            }`}
          >
            🔁 Treyd So'rovlari ({trades.length})
          </button>
        </div>
      </header>

      {/* TAB 1: BRAINROT ITEMS */}
      {activeTab === 'items' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#181124] p-5 rounded-xl border border-white/10 h-fit">
            <h2 className="text-lg font-semibold mb-4 text-purple-400">+ Yangi Brainrot Qo'shish</h2>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nomi</label>
                <input
                  type="text"
                  required
                  placeholder="Sigma GigaChad"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full bg-[#241a35] border border-white/10 rounded p-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Slug (unikal)</label>
                <input
                  type="text"
                  required
                  placeholder="sigma-gigachad"
                  value={newItem.slug}
                  onChange={(e) => setNewItem({ ...newItem, slug: e.target.value })}
                  className="w-full bg-[#241a35] border border-white/10 rounded p-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nodirlik & Orqa Fon Rangi</label>
                <select
                  value={newItem.rarity}
                  onChange={(e) => {
                    const rarity = e.target.value;
                    let glow = '#3b82f6';
                    if (rarity === 'LEGENDARY') glow = '#eab308'; // Gold / Tillarang
                    if (rarity === 'MYTHIC') glow = '#ef4444'; // Red
                    if (rarity === 'SECRET') glow = '#ec4899'; // Rainbow/OG
                    if (rarity === 'EPIC') glow = '#a855f7'; // Purple
                    setNewItem({ ...newItem, rarity, glowColor: glow });
                  }}
                  className="w-full bg-[#241a35] border border-white/10 rounded p-2 text-sm text-white"
                >
                  <option value="COMMON">Common (Ko'k)</option>
                  <option value="RARE">Rare (Yashil)</option>
                  <option value="EPIC">Epic (Binafsha)</option>
                  <option value="LEGENDARY">Legendary (Oltin / Tillarang)</option>
                  <option value="MYTHIC">Mythic (Qizil)</option>
                  <option value="SECRET">Secret (Kamalak / OG Glow)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Maxsus Nur Rangi (Hex)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={newItem.glowColor}
                    onChange={(e) => setNewItem({ ...newItem, glowColor: e.target.value })}
                    className="w-10 h-8 rounded border-0 cursor-pointer"
                  />
                  <span className="text-xs text-gray-300 font-mono">{newItem.glowColor}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Narxi (Coin)</label>
                  <input
                    type="number"
                    value={newItem.priceCoins}
                    onChange={(e) => setNewItem({ ...newItem, priceCoins: Number(e.target.value) })}
                    className="w-full bg-[#241a35] border border-white/10 rounded p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Ferma soatiga (Coin)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newItem.yieldPerHour}
                    onChange={(e) => setNewItem({ ...newItem, yieldPerHour: Number(e.target.value) })}
                    className="w-full bg-[#241a35] border border-white/10 rounded p-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Rasm URL</label>
                <input
                  type="text"
                  value={newItem.imageUrl}
                  onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
                  className="w-full bg-[#241a35] border border-white/10 rounded p-2 text-sm text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition"
              >
                Qo'shish
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h2 className="text-lg font-semibold text-gray-300">Mavjud Personajlar ({items.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="bg-[#181124] p-3 rounded-lg border flex flex-col items-center relative overflow-hidden"
                  style={{ borderColor: it.glowColor }}
                >
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${it.glowColor} 0%, transparent 70%)` }}
                  />
                  <img src={it.imageUrl} alt={it.name} className="w-16 h-16 object-contain mb-2" />
                  <h3 className="font-bold text-sm text-center truncate w-full">{it.name}</h3>
                  <p className="text-xs text-yellow-400 font-bold">{it.priceCoins} Coins</p>
                  <p className="text-[10px] text-gray-400">+{it.yieldPerHour}/soat</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TREYD SO'ROVLARI */}
      {activeTab === 'trades' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-purple-400">
            Kutilayotgan Depozit va Chiqarish So'rovlari (5 daqiqalik taymerli)
          </h2>
          {trades.length === 0 ? (
            <p className="text-gray-400 text-sm">Hozircha faol so'rovlar yo'q.</p>
          ) : (
            <div className="space-y-3">
              {trades.map((tr) => (
                <div
                  key={tr.id}
                  className="bg-[#181124] p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        tr.type === 'DEPOSIT' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {tr.type}
                    </span>
                    <h3 className="font-bold text-base mt-1">Roblox: {tr.robloxUsername}</h3>
                    <p className="text-xs text-gray-400">Telegram: @{tr.user?.username || tr.user?.telegramId}</p>
                    <div className="flex gap-2 mt-2">
                      {tr.items?.map((ti: any) => (
                        <span key={ti.id} className="text-xs bg-white/5 px-2 py-1 rounded border border-white/5">
                          {ti.item?.name} ({ti.item?.priceCoins} Coins)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    {tr.status === 'PENDING' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Roblox VIP Server linki"
                          value={serverLinkInput[tr.id] || ''}
                          onChange={(e) =>
                            setServerLinkInput({ ...serverLinkInput, [tr.id]: e.target.value })
                          }
                          className="bg-[#241a35] border border-white/10 rounded px-3 py-1.5 text-xs text-white w-64"
                        />
                        <button
                          onClick={() => handleApproveTrade(tr.id)}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-black font-bold text-xs rounded transition"
                        >
                          Tasdiqlash (5 min)
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-yellow-400 animate-pulse">
                          ⏳ O'yinchi kutilmoqda...
                        </span>
                        <button
                          onClick={() => handleCompleteTrade(tr.id)}
                          className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs rounded transition"
                        >
                          Yakunlash
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
