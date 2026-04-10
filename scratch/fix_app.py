import sys

file_path = '/Users/karansl/code/KubeSDK/src/App.tsx'

with open(file_path, 'r') as f:
    lines = f.readlines()

# The application block starts around 2020
# Line 2021 was changed to <div className="space-y-6"> by sed
# Line 2043 was changed to LABEL_REPLACE_ME by sed

new_block = """                                        <div className="space-y-6">
                                          {/* Container Basics */}
                                          <div className="space-y-3">
                                            <div className="grid grid-cols-5 gap-2">
                                              <div className="col-span-3">
                                                <input type="text" placeholder="Image (e.g. nginx:latest)" value={config.components[selectedComponentIndex].properties?.image || ''} onChange={(e) => {
                                                  const newComps = [...config.components];
                                                  newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), image: e.target.value };
                                                  setConfig({ ...config, components: newComps });
                                                }} className={cn("w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 transition-all font-mono text-xs", validationStatus[config.components[selectedComponentIndex].id]?.status === 'invalid' ? "border-red-300 focus:ring-red-500/20" : "border-[#DEE2E6] focus:ring-[#0D6EFD]/20")} />
                                              </div>
                                              <div className="col-span-2">
                                                <select value={config.components[selectedComponentIndex].properties?.imagePullPolicy || 'Always'} onChange={(e) => {
                                                  const newComps = [...config.components];
                                                  newComps[selectedComponentIndex].properties = { ...(newComps[selectedComponentIndex].properties || {}), imagePullPolicy: e.target.value };
                                                  setConfig({ ...config, components: newComps });
                                                }} className="w-full px-3 py-2 rounded-lg border border-[#DEE2E6] outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 transition-all bg-white text-xs">
                                                  <option value="Always">Always</option>
                                                  <option value="IfNotPresent">IfNotPresent</option>
                                                  <option value="Never">Never</option>
                                                </select>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Environment Variables */}
                                          <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                              <label className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-wider">Environment Variables</label>
                                              <button 
                                                onClick={() => {
                                                  const newComps = [...config.components];
                                                  const env = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                                  env.push({ name: 'VAR_NAME', value: 'value' });
                                                  newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env };
                                                  setConfig({ ...config, components: newComps });
                                                }}
                                                className="text-[10px] font-bold text-[#0D6EFD] hover:underline flex items-center gap-1"
                                              >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Variable
                                              </button>
                                            </div>
                                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                                              {(config.components[selectedComponentIndex].properties?.env || []).map((env: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                  <input type="text" value={env.name} onChange={(e) => {
                                                    const newComps = [...config.components];
                                                    const envs = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                                    envs[idx] = { ...envs[idx], name: e.target.value };
                                                    newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env: envs };
                                                    setConfig({ ...config, components: newComps });
                                                  }} className="flex-1 px-3 py-1.5 rounded-lg border border-[#DEE2E6] font-mono text-[10px] outline-none text-[#212529] bg-white" />
                                                  <span className="text-[#ADB5BD]">=</span>
                                                  <input type="text" value={env.value} onChange={(e) => {
                                                    const newComps = [...config.components];
                                                    const envs = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                                    envs[idx] = { ...envs[idx], value: e.target.value };
                                                    newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env: envs };
                                                    setConfig({ ...config, components: newComps });
                                                  }} className="flex-1 px-3 py-1.5 rounded-lg border border-[#DEE2E6] font-mono text-[10px] outline-none text-[#212529] bg-white" />
                                                  <button onClick={() => {
                                                    const newComps = [...config.components];
                                                    const envs = [...(newComps[selectedComponentIndex].properties?.env || [])];
                                                    envs.splice(idx, 1);
                                                    newComps[selectedComponentIndex].properties = { ...newComps[selectedComponentIndex].properties, env: envs };
                                                    setConfig({ ...config, components: newComps });
                                                  }} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
"""

# Replace the range 2021 to 2049 (1-indexed)
start_idx = 2020 
end_idx = 2049 

new_lines = lines[:start_idx] + [new_block + '\n'] + lines[end_idx:]

with open(file_path, 'w') as f:
    f.writelines(new_lines)
