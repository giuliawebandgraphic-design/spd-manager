import React from 'react';
import {
  Boxes,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { InventoryItem } from '../types';
import { useStudio } from '../context/StudioContext';

interface InventoryViewProps {
  onNewStock: () => void;
  onEditStock: (item: InventoryItem) => void;
  searchQuery: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  onNewStock,
  onEditStock,
  searchQuery,
}) => {
  const { inventory, adjustStock, deleteInventoryItem } = useStudio();

  const filtered = inventory.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.supplier?.toLowerCase().includes(q) ||
      item.unit.toLowerCase().includes(q)
    );
  });

  const lowStockCount = inventory.filter((i) => i.qty <= i.minimum).length;

  return (
    <div className="space-y-6">
      {/* Alert if low stock */}
      {lowStockCount > 0 && (
        <div className="p-4 rounded-2xl bg-[#fdf0ed] border border-[#f3cfc7] text-[#9b4a40] flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-xs">
              <strong className="font-semibold">
                {lowStockCount} materiali hanno raggiunto o superato la soglia minima di riordino.
              </strong>{' '}
              Verifica le scorte di carte Fedrigoni e buste artigianali per evitare blocchi nella produzione.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-[#e5e9e3] shadow-xs flex items-center justify-between">
        <div className="text-xs text-[#78867d]">
          <strong className="text-[#21362d]">{inventory.length} materiali</strong> registrati nel
          laboratorio
        </div>

        <button
          onClick={onNewStock}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#244d3b] hover:bg-[#1e3f30] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuovo Materiale</span>
        </button>
      </div>

      {/* Inventory Table / Cards */}
      <div className="bg-white rounded-2xl border border-[#e5e9e3] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e5e9e3] bg-[#fafbf9] text-[#78867d] font-bold">
                <th className="py-3.5 px-5">Materiale / Carta</th>
                <th className="py-3.5 px-4">Fornitore / Cartiera</th>
                <th className="py-3.5 px-4 text-center">Unità</th>
                <th className="py-3.5 px-4 text-center">Giacenza</th>
                <th className="py-3.5 px-4 text-center">Soglia Min.</th>
                <th className="py-3.5 px-4 text-center">Stato Scorta</th>
                <th className="py-3.5 px-4 text-center">Azione Rapida</th>
                <th className="py-3.5 px-4 text-right">Modifica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2ec]">
              {filtered.map((item) => {
                const isLow = item.qty <= item.minimum;

                return (
                  <tr key={item.id} className="hover:bg-[#fafbf9] transition-colors">
                    <td className="py-3 px-5 font-semibold text-[#21362d]">{item.name}</td>
                    <td className="py-3 px-4 text-[#78867d]">{item.supplier || 'Cartiera convenzionata'}</td>
                    <td className="py-3 px-4 text-center text-[#78867d]">{item.unit}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-bold text-sm ${
                          isLow ? 'text-[#b76258]' : 'text-[#21362d]'
                        }`}
                      >
                        {item.qty}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-[#78867d]">{item.minimum}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isLow
                            ? 'bg-[#fdf0ed] text-[#b76258]'
                            : 'bg-[#e7f3e8] text-[#2e593d]'
                        }`}
                      >
                        {isLow ? (
                          <>
                            <AlertTriangle className="w-3 h-3" /> Da Riordinare
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Scorta Ok
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => adjustStock(item.id, -10)}
                          className="px-2 py-1 rounded-md bg-[#fafbf9] border border-[#e5e9e3] hover:bg-[#edf2eb] text-[10px] font-bold text-[#5d6e64]"
                          title="Scarica 10 unità per produzione"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => adjustStock(item.id, -1)}
                          className="px-2 py-1 rounded-md bg-[#fafbf9] border border-[#e5e9e3] hover:bg-[#edf2eb] text-[10px] font-bold text-[#5d6e64]"
                          title="Scarica 1 unità"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => adjustStock(item.id, 1)}
                          className="px-2 py-1 rounded-md bg-[#fafbf9] border border-[#e5e9e3] hover:bg-[#edf2eb] text-[10px] font-bold text-[#244d3b]"
                          title="Carica 1 unità"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => adjustStock(item.id, 10)}
                          className="px-2 py-1 rounded-md bg-[#fafbf9] border border-[#e5e9e3] hover:bg-[#edf2eb] text-[10px] font-bold text-[#244d3b]"
                          title="Carica 10 unità"
                        >
                          +10
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onEditStock(item)}
                          className="p-1.5 rounded-lg text-[#8a968c] hover:text-[#263a32] hover:bg-[#edf2eb]"
                          title="Modifica materiale"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Eliminare il materiale ${item.name}?`)) {
                              deleteInventoryItem(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-[#8a968c] hover:text-[#b76258] hover:bg-[#fdf0ed]"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
