import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SiteMetrics from '../../components/SiteMetrics';
import HistoricalChart from '../../components/HistoricalChart';
import { initializeDarkMode, toggleDarkMode } from '../../lib/utils';
import { getSpringBootService, getSpringBootServiceHistory, mapSpringBootToFrontend, deleteService } from '../../lib/springBootApi';
import { ArrowLeft, Trash2 } from 'lucide-react';
import EditServiceForm from '../../components/EditServiceForm';

export default function SiteDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [darkMode, setDarkMode] = useState(false);
  const [site, setSite] = useState(null);
  const [siteHistory, setSiteHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMounted = useRef(false);

  useEffect(() => {
    setDarkMode(initializeDarkMode());
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchSiteData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [sbService, sbHistory] = await Promise.all([
          getSpringBootService(id),
          getSpringBootServiceHistory(id),
        ]);

        if (!sbService) {
          throw new Error('Could not connect to API Monitoring Node or Node not found');
        }

        const mappedSites = mapSpringBootToFrontend([sbService], sbHistory);
        const targetSite = mappedSites[0];

        if (!targetSite) {
          setError('Node mapping failed.');
          return;
        }

        setSite(targetSite);

        const parseDate = (d) => {
          if (!d) return new Date();
          if (Array.isArray(d)) return new Date(d[0], d[1] - 1, d[2], d[3] || 0, d[4] || 0, d[5] || 0);
          return new Date(d);
        };

        const processedHistory = sbHistory.map(h => ({
          status: h.status === 'UP' ? 'operational' : 'outage',
          responseTime: h.responseTime,
          timestamp: parseDate(h.checkedAt).toISOString(),
        })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        console.log("Processed History for Chart:", processedHistory);

        setSiteHistory({
          hourlyData: processedHistory,
          dailyData: []
        });

      } catch (err) {
        console.error('Error fetching site data:', err);
        setError('Failed to load site data.');
      } finally {
        setLoading(false);
      }
    };

    fetchSiteData();

    const refreshInterval = setInterval(fetchSiteData, 600000);
    return () => clearInterval(refreshInterval);
  }, [id]);

  const handleToggleDarkMode = () => {
    toggleDarkMode(setDarkMode);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this monitored service?')) {
      try {
        await deleteService(id);
        router.push('/');
      } catch (err) {
        console.error('Failed to delete:', err);
        alert('Failed to delete service. Please try again later.');
      }
    }
  };

  const handleServiceUpdated = () => {
    window.location.reload();
  };

  if (!id) return null;

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark' : ''}`}>
      <Head>
        <title>{site ? `${site.name} | API Monitoring Status` : 'Loading Site Status...'}</title>
        <meta name="description" content={site ? `Current status and performance metrics for ${site.name}` : 'Loading site status information'} />
      </Head>

      <Header toggleTheme={handleToggleDarkMode} isDarkMode={darkMode} />

      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <Link href="/" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Status Dashboard
            </Link>

            {!loading && !error && site && (
              <div className="flex gap-2">
                <EditServiceForm site={site} onServiceUpdated={handleServiceUpdated} />
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-1.5 border border-red-600 text-xs font-medium rounded-lg text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <Trash2 className="-ml-1 mr-1.5 h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
              {error}
            </div>
          ) : site ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <div className="flex items-center">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {site.name}
                      </h1>
                      <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-600">
                        {site.category || 'Endpoint'}
                      </span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      {site.description}
                    </p>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm inline-block mt-2"
                    >
                      {site.url}
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <SiteMetrics site={site} />
                </div>

                <div className="lg:col-span-2">
                  <HistoricalChart
                    siteHistory={siteHistory}
                    siteId={id}
                    siteName={site.name}
                    site={site}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-800 dark:text-yellow-200">
              Site not found
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
