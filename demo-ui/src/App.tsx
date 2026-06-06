import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Send, 
  Database, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Sparkles, 
  Users, 
  X, 
  Loader2, 
  Info, 
  ArrowRight,
  Flame,
  Thermometer,
  Snowflake,
  RefreshCw
} from 'lucide-react';

interface LeadResult {
  lead_id?: string;
  score: number;
  category: 'hot' | 'warm' | 'cold';
  summary: string;
  recommended_action: string;
  reasoning: string;
}

interface StatRow {
  category: 'hot' | 'warm' | 'cold';
  total: number;
  avg_score: number;
}

interface LeadRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  score: number;
  category: 'hot' | 'warm' | 'cold';
  summary: string;
  received_at: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'qualify' | 'dashboard'>('qualify');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    budget: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<LeadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Settings state (initialized from localStorage if available)
  const [settings, setSettings] = useState({
    n8nWebhookUrl: localStorage.getItem('n8n_webhook_url') || 'http://localhost:5678/webhook/qualify-lead',
    supabaseUrl: localStorage.getItem('supabase_url') || '',
    supabaseAnonKey: localStorage.getItem('supabase_anon_key') || ''
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState({ ...settings });

  // Dashboard state
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [latestLeads, setLatestLeads] = useState<LeadRecord[]>([]);
  const [isDemoData, setIsDemoData] = useState(true);

  // Mock data for demo purposes when Supabase is not connected
  const mockStats: StatRow[] = [
    { category: 'hot', total: 14, avg_score: 84 },
    { category: 'warm', total: 28, avg_score: 54 },
    { category: 'cold', total: 42, avg_score: 22 }
  ];

  const mockLeads: LeadRecord[] = [
    {
      id: '1',
      name: 'Sophie Martin',
      email: 'sophie@techstartup.io',
      company: 'TechStartup SAS',
      score: 82,
      category: 'hot',
      summary: 'High budget onboarding automation request. Immediate sales engagement recommended.',
      received_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '2',
      name: 'Jean Dupont',
      email: 'jean@dupont-consulting.fr',
      company: 'Dupont Consulting',
      score: 58,
      category: 'warm',
      summary: 'General query regarding platform limits. Medium potential.',
      received_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: '3',
      name: 'Alice Mercer',
      email: 'alice@freelance.org',
      company: 'Freelance',
      score: 18,
      category: 'cold',
      summary: 'Looking for a free tier. Low budget and no company context.',
      received_at: new Date(Date.now() - 14400000).toISOString()
    },
    {
      id: '4',
      name: 'Marc Koenig',
      email: 'm.koenig@enterprise.de',
      company: 'Enterprise AG',
      score: 95,
      category: 'hot',
      summary: 'Enterprise-grade pipeline solution search. High urgency.',
      received_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  // Load stats from Supabase or Fallback to Demo Data
  const loadDashboardData = async () => {
    if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
      setStats(mockStats);
      setLatestLeads(mockLeads);
      setIsDemoData(true);
      return;
    }

    setIsStatsLoading(true);
    setIsDemoData(false);
    try {
      // Fetch aggregated stats from view: lead_stats
      const statsRes = await fetch(`${settings.supabaseUrl}/rest/v1/lead_stats`, {
        headers: {
          'apikey': settings.supabaseAnonKey,
          'Authorization': `Bearer ${settings.supabaseAnonKey}`,
          'Range': '0-9'
        }
      });
      
      // Fetch latest 5 qualified leads
      const leadsRes = await fetch(`${settings.supabaseUrl}/rest/v1/leads?order=received_at.desc&limit=5`, {
        headers: {
          'apikey': settings.supabaseAnonKey,
          'Authorization': `Bearer ${settings.supabaseAnonKey}`
        }
      });

      if (!statsRes.ok || !leadsRes.ok) {
        throw new Error('Supabase returned error. Please check your credentials.');
      }

      const statsData = await statsRes.json();
      const leadsData = await leadsRes.json();

      setStats(statsData);
      setLatestLeads(leadsData);
    } catch (err: any) {
      console.error(err);
      // Fallback on error
      setStats(mockStats);
      setLatestLeads(mockLeads);
      setIsDemoData(true);
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [settings]);

  // Handle Form Change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Submit Lead to Webhook
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    setErrorMessage(null);

    try {
      const response = await fetch(settings.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Server returned error code: ${response.status}`);
      }

      const data = await response.json();
      
      // n8n returns details or we parse it
      if (data.score !== undefined) {
        setResult(data);
        // Refresh dashboard statistics
        loadDashboardData();
      } else {
        throw new Error("Invalid response format. Missing lead score/details.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while calling the webhook.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save settings
  const handleSaveSettings = () => {
    localStorage.setItem('n8n_webhook_url', tempSettings.n8nWebhookUrl);
    localStorage.setItem('supabase_url', tempSettings.supabaseUrl);
    localStorage.setItem('supabase_anon_key', tempSettings.supabaseAnonKey);
    setSettings(tempSettings);
    setIsSettingsOpen(false);
  };

  // Calculate Gauge Dash Array values
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = (score: number) => circumference - (score / 100) * circumference;

  const getScoreColor = (category: string) => {
    if (category === 'hot') return 'var(--hot)';
    if (category === 'warm') return 'var(--warm)';
    return 'var(--cold)';
  };

  const getCategoryIcon = (category: string) => {
    if (category === 'hot') return <Flame className="w-5 h-5 text-red-500" style={{ color: 'var(--hot)' }} />;
    if (category === 'warm') return <Thermometer className="w-5 h-5 text-orange-500" style={{ color: 'var(--warm)' }} />;
    return <Snowflake className="w-5 h-5 text-blue-500" style={{ color: 'var(--cold)' }} />;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(138, 92, 246, 0.15) 0%, rgba(0,0,0,0) 70%)',
        zIndex: -1,
        pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '5%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(0,0,0,0) 70%)',
        zIndex: -1,
        pointerEvents: 'none'
      }}></div>

      {/* Header */}
      <header className="glass-panel" style={{
        margin: '20px auto 10px auto',
        width: '92%',
        maxWidth: '1200px',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--card-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px var(--primary-glow)'
          }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(to right, #fff, var(--text-muted))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>AI Lead Qualifier</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pipeline Intelligence Hub</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.2)', padding: '4px', borderRadius: '8px' }}>
          <button 
            onClick={() => setActiveTab('qualify')}
            className={`btn-secondary`}
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'qualify' ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === 'qualify' ? 'white' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Send className="w-4 h-4" /> Qualify Lead
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`btn-secondary`}
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'dashboard' ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === 'dashboard' ? 'white' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Database className="w-4 h-4" /> Dashboard
          </button>
        </div>

        {/* Settings Button */}
        <button 
          onClick={() => {
            setTempSettings({ ...settings });
            setIsSettingsOpen(true);
          }}
          className="btn-secondary"
          style={{ padding: '10px', borderRadius: '10px' }}
          title="Endpoint Configuration"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        width: '92%',
        maxWidth: '1200px',
        margin: '20px auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Warning Banner for Demo Data */}
        {activeTab === 'dashboard' && isDemoData && (
          <div className="glass-panel animate-fade-in" style={{
            padding: '12px 24px',
            marginBottom: '20px',
            borderColor: 'var(--warm-border)',
            background: 'rgba(255, 152, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertTriangle className="text-orange-500 w-5 h-5" style={{ color: 'var(--warm)' }} />
            <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'white' }}>Demo Sandbox Mode:</strong> Showing simulated pipeline statistics. Click the <span style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--secondary)' }} onClick={() => setIsSettingsOpen(true)}>Settings Gear</span> to input your Supabase credentials and read data directly from your SQL schema views.
            </div>
          </div>
        )}

        {/* Tab 1: Qualify Lead Form */}
        {activeTab === 'qualify' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
            
            {/* Form Panel */}
            <section className="glass-panel animate-fade-in" style={{ padding: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700 }}>Inbound Lead Information</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Enter lead info below to run the real-time AI scoring model.</p>
              </div>

              <form onSubmit={handleSubmitLead}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      name="name" 
                      required 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      className="form-input" 
                      placeholder="e.g. Sophie Martin"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      name="email" 
                      required 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      className="form-input" 
                      placeholder="e.g. sophie@tech.io"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input 
                    type="text" 
                    name="company" 
                    value={formData.company} 
                    onChange={handleInputChange} 
                    className="form-input" 
                    placeholder="e.g. TechStartup SAS"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Budget</label>
                  <input 
                    type="text" 
                    name="budget" 
                    value={formData.budget} 
                    onChange={handleInputChange} 
                    className="form-input" 
                    placeholder="e.g. 5,000 - 10,000 EUR"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Customer message</label>
                  <textarea 
                    name="message" 
                    rows={4} 
                    value={formData.message} 
                    onChange={handleInputChange} 
                    className="form-input" 
                    style={{ resize: 'vertical' }}
                    placeholder="Describe their inquiry, needs, scale or onboarding requirements..."
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin-custom" />
                      Analyzing and Qualifying...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Qualify Inbound Lead
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Results Panel */}
            <section className="glass-panel" style={{ 
              padding: '32px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: result || errorMessage || isSubmitting ? 'flex-start' : 'center',
              alignItems: 'stretch',
              position: 'relative',
              overflow: 'hidden'
            }}>
              
              {/* Grid Background Overlay for Results */}
              <div style={{
                position: 'absolute',
                top: 0, right: 0, bottom: 0, left: 0,
                backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.01) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.01) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                pointerEvents: 'none'
              }}></div>

              {/* State 1: Loading Scanner */}
              {isSubmitting && (
                <div className="animate-fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{
                    position: 'relative',
                    width: '120px',
                    height: '120px',
                    margin: '0 auto 24px auto',
                    borderRadius: '50%',
                    border: '3px solid rgba(138, 92, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      borderTop: '3px solid var(--primary)',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <Sparkles className="w-8 h-8 text-violet-400 animate-pulse" style={{ color: 'var(--primary)' }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>AI Agent Scrutinizing Lead</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '280px', margin: '0 auto' }}>
                    Standardizing fields, running Serper.dev web queries and scoring with GPT-4o-mini...
                  </p>
                </div>
              )}

              {/* State 2: Error Message */}
              {errorMessage && !isSubmitting && (
                <div className="glass-panel animate-fade-in" style={{
                  padding: '24px',
                  borderColor: 'rgba(244, 67, 54, 0.3)',
                  background: 'rgba(244, 67, 54, 0.04)',
                  textAlign: 'center'
                }}>
                  <AlertTriangle className="text-red-500 w-12 h-12" style={{ margin: '0 auto 16px auto', color: 'var(--hot)' }} />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Webhook Call Failed</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>{errorMessage}</p>
                  <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    <strong>Verify settings:</strong> Ensure your local n8n instance is running, webhook active, or Railway URL is correct in the Settings.
                  </div>
                </div>
              )}

              {/* State 3: Show Successful Results */}
              {result && !isSubmitting && (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>AI Evaluation Result</h3>
                    <span className={`badge badge-${result.category}`}>
                      {getCategoryIcon(result.category)}
                      {result.category}
                    </span>
                  </div>

                  {/* Circular Score Gauge */}
                  <div className="gauge-container" style={{ marginBottom: '24px' }}>
                    <svg className="gauge-svg" width="150" height="150">
                      <circle className="gauge-bg" cx="75" cy="75" r={radius} />
                      <circle 
                        className="gauge-value" 
                        cx="75" 
                        cy="75" 
                        r={radius} 
                        style={{
                          stroke: getScoreColor(result.category),
                          strokeDasharray: circumference,
                          strokeDashoffset: strokeDashoffset(result.score)
                        }}
                      />
                    </svg>
                    <div className="gauge-text">
                      <div className="gauge-score" style={{ color: getScoreColor(result.category) }}>{result.score}</div>
                      <div className="gauge-label">Score</div>
                    </div>
                  </div>

                  {/* Card metadata fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                      <span className="form-label" style={{ fontSize: '0.7rem' }}>AI Summary</span>
                      <p style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>{result.summary}</p>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                      <span className="form-label" style={{ fontSize: '0.7rem' }}>Recommended Next Action</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowRight className="w-4 h-4" /> {result.recommended_action}
                      </p>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                      <span className="form-label" style={{ fontSize: '0.7rem' }}>Qualification Reasoning</span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{result.reasoning}</p>
                    </div>

                    {result.lead_id && (
                      <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dark)' }}>
                        <span>ID: {result.lead_id}</span>
                        <span style={{ color: 'rgba(76, 175, 80, 0.8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Saved to Supabase
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* State 4: Empty / Idle State */}
              {!result && !errorMessage && !isSubmitting && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed var(--card-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px auto'
                  }}>
                    <Database className="w-8 h-8 text-slate-500" style={{ color: 'var(--text-dark)' }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Waiting for Inbound Lead</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '280px', margin: '0 auto' }}>
                    Submit the form on the left. The qualifying agent will instantly classify and rate the opportunity.
                  </p>
                </div>
              )}

            </section>
          </div>
        )}

        {/* Tab 2: Dashboard Real-time Stats */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Metric Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              
              {/* Total Leads */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '10px' }}>
                  <Users className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Inbound</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                    {stats.reduce((acc, curr) => acc + Number(curr.total), 0)}
                  </div>
                </div>
              </div>

              {/* Hot Leads Stats */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'var(--hot-bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--hot-border)' }}>
                  <Flame className="w-6 h-6" style={{ color: 'var(--hot)' }} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hot Opportunities</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    {stats.find(s => s.category === 'hot')?.total || 0}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--hot)' }}>
                      Avg: {stats.find(s => s.category === 'hot')?.avg_score || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warm Leads Stats */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'var(--warm-bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--warm-border)' }}>
                  <Thermometer className="w-6 h-6" style={{ color: 'var(--warm)' }} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warm Leads</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    {stats.find(s => s.category === 'warm')?.total || 0}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--warm)' }}>
                      Avg: {stats.find(s => s.category === 'warm')?.avg_score || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cold Leads Stats */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'var(--cold-bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--cold-border)' }}>
                  <Snowflake className="w-6 h-6" style={{ color: 'var(--cold)' }} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cold Leads</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    {stats.find(s => s.category === 'cold')?.total || 0}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--cold)' }}>
                      Avg: {stats.find(s => s.category === 'cold')?.avg_score || 0}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Leads Table Container */}
            <section className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>Real-Time Pipeline Leads</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Latest leads qualified by the agent, structured and ordered.</p>
                </div>
                
                <button 
                  onClick={loadDashboardData}
                  disabled={isStatsLoading}
                  className="btn-secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isStatsLoading ? 'animate-spin-custom' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Lead</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Company</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Score</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Category</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>AI Assessment</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestLeads.map((lead) => (
                      <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="table-row-hover">
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 600, color: 'white' }}>{lead.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.email}</div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          {lead.company || '—'}
                        </td>
                        <td style={{ padding: '16px', fontWeight: 700, fontSize: '1.1rem', color: getScoreColor(lead.category) }}>
                          {lead.score}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span className={`badge badge-${lead.category}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                            {lead.category}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={lead.summary}>
                          {lead.summary}
                        </td>
                        <td style={{ padding: '16px', fontSize: '0.8rem', color: 'var(--text-dark)' }}>
                          {new Date(lead.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}

                    {latestLeads.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dark)' }}>
                          No leads in the database yet. Submit leads through the qualify form.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </section>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        fontSize: '0.75rem',
        color: 'var(--text-dark)',
        borderTop: '1px solid rgba(255,255,255,0.02)',
        marginTop: 'auto'
      }}>
        🤖 AI Lead Qualification Agent Hub • Built with React, Supabase Views, & n8n
      </footer>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 6, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} className="animate-fade-in">
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '540px',
            padding: '32px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              style={{
                position: 'absolute',
                top: '20px', right: '20px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              <X className="w-5 h-5" />
            </button>

            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings className="w-5 h-5 text-violet-400" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>Integration Settings</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifySelf: 'space-between', width: '100%' }}>
                  <span>n8n Webhook Endpoint URL</span>
                  <span style={{ fontSize: '0.65rem', textTransform: 'lowercase', color: 'var(--secondary)' }}>POST target</span>
                </label>
                <input 
                  type="text" 
                  value={tempSettings.n8nWebhookUrl}
                  onChange={(e) => setTempSettings({ ...tempSettings, n8nWebhookUrl: e.target.value })}
                  className="form-input" 
                  placeholder="http://localhost:5678/webhook/qualify-lead"
                />
              </div>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
                <span className="form-label" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Database className="w-3 h-3 text-cyan-400" /> Supabase Connection (Optional)
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginBottom: '12px' }}>
                  Connect your live database to load statistics from the <code>lead_stats</code> SQL view.
                </p>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.65rem' }}>Supabase Project URL</label>
                  <input 
                    type="text" 
                    value={tempSettings.supabaseUrl}
                    onChange={(e) => setTempSettings({ ...tempSettings, supabaseUrl: e.target.value })}
                    className="form-input" 
                    style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                    placeholder="https://xyzcompany.supabase.co"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.65rem' }}>Supabase Public Anon Key</label>
                  <input 
                    type="password" 
                    value={tempSettings.supabaseAnonKey}
                    onChange={(e) => setTempSettings({ ...tempSettings, supabaseAnonKey: e.target.value })}
                    className="form-input" 
                    style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="btn-secondary"
                style={{ padding: '10px 20px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSettings}
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '0.85rem' }}
              >
                Save configurations
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
