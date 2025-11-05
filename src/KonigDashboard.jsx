import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const PRIORIDADES = ['Alta','Media','Baja'];
const ESTADOS = ['Pendiente','En curso','Completada'];
const RESPONSABLES = ['María','Luis','Carla','Federico'];

const sample = [
  { id: 't1', titulo: 'Revisión de contratos', prioridad: 'Alta', estado: 'En curso', responsable: 'María', vencimiento: '2025-11-12', progreso: 40 },
  { id: 't2', titulo: 'Informe de ventas', prioridad: 'Media', estado: 'Completada', responsable: 'Luis', vencimiento: '2025-10-30', progreso: 100 },
  { id: 't3', titulo: 'Actualizar precios', prioridad: 'Alta', estado: 'Pendiente', responsable: 'Carla', vencimiento: '2025-11-20', progreso: 0 },
];

function uid(){ return 't_' + Math.random().toString(36).slice(2,9); }

export default function KonigDashboard(){
  const [tasks, setTasks] = useState(()=>{
    try{
      const raw = localStorage.getItem('konig_tasks_v1');
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return sample;
  });
  const [tab, setTab] = useState('tareas');
  const [showExport, setShowExport] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(()=>{
    try{ localStorage.setItem('konig_tasks_v1', JSON.stringify(tasks)); }catch(e){}
  },[tasks]);

  const filtered = useMemo(()=> tasks.filter(t=> (t.titulo + ' ' + t.responsable).toLowerCase().includes(query.toLowerCase())), [tasks,query]);

  const metrics = useMemo(()=>{
    const total = tasks.length;
    const completadas = tasks.filter(t=>t.estado==='Completada').length;
    const atrasadas = tasks.filter(t => t.vencimiento && new Date(t.vencimiento) < new Date() && t.estado !== 'Completada').length;
    return { total, completadas, atrasadas };
  },[tasks]);

  const statusData = ESTADOS.map(s=> ({ name: s, value: tasks.filter(t=>t.estado===s).length }));
  const prioridadData = PRIORIDADES.map(p=> ({ name: p, value: tasks.filter(t=>t.prioridad===p).length }));
  const userData = RESPONSABLES.map(u=> ({ name: u, value: tasks.filter(t=>t.responsable===u).length }));
  const COLORS = ['#00BFA6','#00A88F','#1A1A1A'];

  function addTask(){
    const nt = { id: uid(), titulo: 'Nueva tarea', prioridad: 'Media', estado: 'Pendiente', responsable: '', vencimiento: '', progreso: 0 };
    setTasks(s=> [nt, ...s]);
  }

  function updateTask(id, patch){
    setTasks(s=> s.map(t=> t.id===id ? {...t, ...patch} : t));
  }

  function removeTask(id){
    setTasks(s=> s.filter(t=> t.id !== id));
  }

  function exportExcel(){
    const ws = XLSX.utils.json_to_sheet(tasks.map(t=>({
      Título: t.titulo,
      Prioridad: t.prioridad,
      Estado: t.estado,
      Responsable: t.responsable,
      Vencimiento: t.vencimiento,
      Progreso: t.progreso + '%'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tareas');
    const wbout = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    saveAs(new Blob([wbout],{type:'application/octet-stream'}), 'reporte_tareas.xlsx');
    setShowExport(false);
  }

  function exportPDF(){
    // versión simple: texto que el usuario puede descargar; puede mejorarse con html2canvas o server
    const lines = tasks.map(t=> `${t.titulo} — ${t.estado} — ${t.prioridad} — ${t.responsable} — Vence: ${t.vencimiento || '-'} `);
    const blob = new Blob([ 'Reporte KÖNIG | Seguimiento de Tareas\n\n' + lines.join('\n') ], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'reporte_tareas.txt');
    setShowExport(false);
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <nav className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div style={{fontWeight:700, color:'var(--konig)'}} className="text-xl">KÖNIG</div>
          <div style={{color:'var(--grafito)'}} className="text-sm">| Seguimiento de Tareas</div>
        </div>

        <div className="flex items-center gap-3">
          <input placeholder="Buscar tareas..." value={query} onChange={e=>setQuery(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-64" />
          <button onClick={addTask} className="bg-konig text-white px-4 py-2 rounded">+ Nueva tarea</button>
        </div>
      </nav>

      <header className="mb-4 flex items-center justify-between">
        <div className="flex gap-4">
          <button onClick={()=>setTab('tareas')} className={`px-4 py-2 rounded ${tab==='tareas' ? 'bg-konig text-white' : 'bg-gray-100'}`}>Tareas</button>
          <button onClick={()=>setTab('reportes')} className={`px-4 py-2 rounded ${tab==='reportes' ? 'bg-konig text-white' : 'bg-gray-100'}`}>Reportes</button>
        </div>
        <div className="text-sm text-gray-600">Última sincronización local: {new Date().toLocaleString()}</div>
      </header>

      {tab === 'tareas' ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white p-4 rounded shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b"><th>Título</th><th>Prioridad</th><th>Estado</th><th>Responsable</th><th>Vencimiento</th><th></th></tr></thead>
              <tbody>
                {filtered.map(task=> (
                  <tr key={task.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">
                      <input className="w-full text-sm" value={task.titulo} onChange={e=> updateTask(task.id, { titulo: e.target.value })} />
                    </td>
                    <td>
                      <select value={task.prioridad} onChange={e=> updateTask(task.id, { prioridad: e.target.value })} className="text-sm">
                        {PRIORIDADES.map(p=> <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={task.estado} onChange={e=> updateTask(task.id, { estado: e.target.value })} className="text-sm">
                        {ESTADOS.map(s=> <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={task.responsable} onChange={e=> updateTask(task.id, { responsable: e.target.value })} className="text-sm">
                        <option value="">--</option>
                        {RESPONSABLES.map(r=> <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td><input type="date" value={task.vencimiento || ''} onChange={e=> updateTask(task.id, { vencimiento: e.target.value })} className="text-sm" /></td>
                    <td className="text-right">
                      <button onClick={()=> removeTask(task.id) } className="text-red-500 text-sm">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="bg-white p-4 rounded shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Resumen</h3>
            <div className="space-y-2 text-sm">
              <div>Total tareas: <strong>{metrics.total}</strong></div>
              <div>Completadas: <strong>{metrics.completadas}</strong></div>
              <div>Atrasadas: <strong>{metrics.atrasadas}</strong></div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Miembros</h4>
              <ul className="text-sm space-y-2">
                {RESPONSABLES.map(r=> <li key={r} className="flex justify-between">{r} <span className="text-gray-500">{tasks.filter(t=>t.responsable===r).length}</span></li>)}
              </ul>
            </div>
          </aside>
        </div>
      ) : (
        <div className="bg-white p-4 rounded shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Reportes y estadísticas</h2>
            <div className="relative">
              <button className="bg-konig text-white px-4 py-2 rounded" onClick={()=> setShowExport(s=>!s)}>Exportar ▾</button>
              {showExport && (
                <div className="absolute right-0 mt-2 bg-white border rounded shadow z-10">
                  <button onClick={exportPDF} className="block px-4 py-2 w-full text-left hover:bg-gray-100">📄 Exportar a PDF</button>
                  <button onClick={exportExcel} className="block px-4 py-2 w-full text-left hover:bg-gray-100">📊 Exportar a Excel</button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-white p-2 rounded">
              <h4 className="text-sm font-medium mb-2">Por estado</h4>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={60} label>
                    {statusData.map((entry, idx)=>( <Cell key={idx} fill={COLORS[idx%COLORS.length]} /> ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="col-span-1 bg-white p-2 rounded">
              <h4 className="text-sm font-medium mb-2">Por prioridad</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={prioridadData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00BFA6" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="col-span-1 bg-white p-2 rounded">
              <h4 className="text-sm font-medium mb-2">Por responsable</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={userData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1A1A1A" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Resumen</h4>
            <div className="flex gap-4">
              <div className="p-3 bg-gray-50 rounded">Total: <strong>{metrics.total}</strong></div>
              <div className="p-3 bg-green-50 rounded">Completadas: <strong>{metrics.completadas}</strong></div>
              <div className="p-3 bg-red-50 rounded">Atrasadas: <strong>{metrics.atrasadas}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}