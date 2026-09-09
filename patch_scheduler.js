const fs = require('fs');

const path = 'src/components/tabs/SchedulerTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// Imports
content = content.replace("Calendar,", "Calendar, Edit2, Check, X,");

// States
const stateSearch = "const [errorMsg, setErrorMsg] = useState<string | null>(null);";
const stateReplace = `const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editCronValue, setEditCronValue] = useState<string>('');
  const [isSavingCron, setIsSavingCron] = useState(false);

  const PRESET_CRONS = [
    { label: 'Her 5 Dakikada Bir', value: '*/5 * * * *' },
    { label: 'Her 15 Dakikada Bir', value: '*/15 * * * *' },
    { label: 'Her 30 Dakikada Bir', value: '*/30 * * * *' },
    { label: 'Her Saat Başı', value: '0 * * * *' },
    { label: 'Her 2 Saatte Bir', value: '0 */2 * * *' },
    { label: 'Her 4 Saatte Bir', value: '0 */4 * * *' },
    { label: 'Hafta İçi Borsa (15 dk)', value: '*/15 7-18 * * 1-5' },
    { label: 'Hafta İçi Akşam 21:00', value: '0 21 * * 1-5' },
    { label: 'Perşembe 20:00', value: '0 20 * * 4' },
    { label: 'Cuma 20:00', value: '0 20 * * 5' },
  ];

  const handleUpdateCron = async (taskId: string, currentEnabled: boolean) => {
    setIsSavingCron(true);
    try {
      const res = await fetch(\`/api/v1/scheduler/update/\${taskId}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronExpr: editCronValue, enabled: currentEnabled })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Zamanlama başarıyla güncellendi.');
        setEditingTaskId(null);
        await fetchStatus();
      } else {
        setErrorMsg(data.error || 'Zamanlama güncellenemedi.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Bağlantı hatası.');
    } finally {
      setIsSavingCron(false);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 5000);
    }
  };`;
content = content.replace(stateSearch, stateReplace);

const uiSearch = `                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                  <span>Cron İfadesi:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-[11px]">
                    {task.cronExpr}
                  </span>
                </div>`;

const uiReplace = `                {editingTaskId === task.id ? (
                  <div className="flex flex-col gap-2 bg-neutral-100 dark:bg-neutral-800 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Zamanlamayı Düzenle</div>
                    <select
                      value={editCronValue}
                      onChange={(e) => setEditCronValue(e.target.value)}
                      className="w-full text-xs p-1.5 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600"
                    >
                      {PRESET_CRONS.map(p => (
                        <option key={p.value} value={p.value}>{p.label} ({p.value})</option>
                      ))}
                      {!PRESET_CRONS.find(p => p.value === editCronValue) && (
                        <option value={editCronValue}>Özel ({editCronValue})</option>
                      )}
                    </select>
                    <input 
                      type="text" 
                      value={editCronValue} 
                      onChange={(e) => setEditCronValue(e.target.value)}
                      className="w-full text-xs font-mono p-1.5 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600"
                      placeholder="* * * * *"
                    />
                    <div className="flex gap-2 justify-end mt-1">
                      <button 
                        onClick={() => setEditingTaskId(null)} 
                        className="p-1 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300"
                      >
                        <X size={14} />
                      </button>
                      <button 
                        onClick={() => handleUpdateCron(task.id, task.enabled)} 
                        disabled={isSavingCron}
                        className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSavingCron ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                    <span>Cron İfadesi:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-[11px]">
                        {task.cronExpr}
                      </span>
                      <button 
                        onClick={() => {
                          setEditCronValue(task.cronExpr);
                          setEditingTaskId(task.id);
                        }}
                        className="p-1 text-neutral-400 hover:text-blue-600 transition-colors"
                        title="Zamanlamayı Düzenle"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </div>
                )}`;

content = content.replace(uiSearch, uiReplace);

fs.writeFileSync(path, content);
console.log("Done");
