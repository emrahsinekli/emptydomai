import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { fetchWhoisInfo, type WhoisInfo } from './whois';

export interface TrackedDomain {
  id: string;
  userId: string;
  domain: string;
  tld: string;
  fullDomain: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  registrar?: string;
  lastChecked: string;
  status: 'active' | 'expiring-soon' | 'expired' | 'available' | 'error';
  notificationSent?: boolean;
  notes?: string;
  createdAt: string;
}

export interface ExpiryAlert {
  domain: string;
  expiryDate: string;
  daysUntilExpiry: number;
  alertLevel: 'warning' | 'critical' | 'expired';
  message: string;
}

// Add a domain to tracking
export async function addDomainToTracking(
  userId: string,
  domain: string,
  tld: string,
  notes?: string
): Promise<TrackedDomain> {
  const db = getFirebaseDb();
  const fullDomain = `${domain}${tld}`;
  const id = `${userId}_${fullDomain.replace(/\./g, '_')}`;

  // Fetch WHOIS info
  const whoisInfo = await fetchWhoisInfo(fullDomain);

  const trackedDomain: TrackedDomain = {
    id,
    userId,
    domain,
    tld,
    fullDomain,
    expiryDate: whoisInfo.expiryDate,
    daysUntilExpiry: whoisInfo.daysUntilExpiry,
    registrar: whoisInfo.registrar,
    lastChecked: new Date().toISOString(),
    status: getStatusFromWhois(whoisInfo),
    notes,
    createdAt: new Date().toISOString(),
  };

  // Save to Firestore
  const docRef = doc(db, 'tracked_domains', id);
  await setDoc(docRef, trackedDomain);

  return trackedDomain;
}

// Get status from WHOIS info
function getStatusFromWhois(whoisInfo: WhoisInfo): TrackedDomain['status'] {
  if (whoisInfo.error === 'Domain not registered') {
    return 'available';
  }
  if (whoisInfo.error) {
    return 'error';
  }
  if (whoisInfo.daysUntilExpiry !== undefined) {
    if (whoisInfo.daysUntilExpiry <= 0) {
      return 'expired';
    }
    if (whoisInfo.daysUntilExpiry <= 30) {
      return 'expiring-soon';
    }
  }
  return 'active';
}

// Get all tracked domains for a user
export async function getTrackedDomains(userId: string): Promise<TrackedDomain[]> {
  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, 'tracked_domains'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TrackedDomain);
  } catch (error) {
    console.error('Error fetching tracked domains:', error);
    return [];
  }
}

// Remove domain from tracking
export async function removeDomainFromTracking(id: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, 'tracked_domains', id));
}

// Update domain tracking info
export async function updateDomainTracking(id: string): Promise<TrackedDomain | null> {
  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'tracked_domains', id);
    const docSnapshot = await getDocs(query(collection(db, 'tracked_domains'), where('id', '==', id)));

    if (docSnapshot.empty) {
      return null;
    }

    const currentData = docSnapshot.docs[0].data() as TrackedDomain;
    const whoisInfo = await fetchWhoisInfo(currentData.fullDomain);

    const updatedDomain: TrackedDomain = {
      ...currentData,
      expiryDate: whoisInfo.expiryDate,
      daysUntilExpiry: whoisInfo.daysUntilExpiry,
      registrar: whoisInfo.registrar,
      lastChecked: new Date().toISOString(),
      status: getStatusFromWhois(whoisInfo),
    };

    await setDoc(docRef, updatedDomain);
    return updatedDomain;
  } catch (error) {
    console.error('Error updating domain tracking:', error);
    return null;
  }
}

// Get expiry alerts for a user
export async function getExpiryAlerts(userId: string): Promise<ExpiryAlert[]> {
  const trackedDomains = await getTrackedDomains(userId);
  const alerts: ExpiryAlert[] = [];

  for (const domain of trackedDomains) {
    if (domain.status === 'expired') {
      alerts.push({
        domain: domain.fullDomain,
        expiryDate: domain.expiryDate || 'Unknown',
        daysUntilExpiry: 0,
        alertLevel: 'expired',
        message: `${domain.fullDomain} has expired! Act now to acquire it.`,
      });
    } else if (domain.status === 'expiring-soon' && domain.daysUntilExpiry !== undefined) {
      if (domain.daysUntilExpiry <= 7) {
        alerts.push({
          domain: domain.fullDomain,
          expiryDate: domain.expiryDate || 'Unknown',
          daysUntilExpiry: domain.daysUntilExpiry,
          alertLevel: 'critical',
          message: `${domain.fullDomain} expires in ${domain.daysUntilExpiry} days!`,
        });
      } else {
        alerts.push({
          domain: domain.fullDomain,
          expiryDate: domain.expiryDate || 'Unknown',
          daysUntilExpiry: domain.daysUntilExpiry,
          alertLevel: 'warning',
          message: `${domain.fullDomain} expires on ${domain.expiryDate}`,
        });
      }
    } else if (domain.status === 'available') {
      alerts.push({
        domain: domain.fullDomain,
        expiryDate: 'N/A',
        daysUntilExpiry: 0,
        alertLevel: 'critical',
        message: `${domain.fullDomain} is now available for registration!`,
      });
    }
  }

  // Sort by urgency
  return alerts.sort((a, b) => {
    const priority = { expired: 0, critical: 1, warning: 2 };
    return priority[a.alertLevel] - priority[b.alertLevel];
  });
}

// Batch update all tracked domains
export async function batchUpdateTrackedDomains(userId: string): Promise<TrackedDomain[]> {
  const trackedDomains = await getTrackedDomains(userId);
  const updatedDomains: TrackedDomain[] = [];

  for (const domain of trackedDomains) {
    const updated = await updateDomainTracking(domain.id);
    if (updated) {
      updatedDomains.push(updated);
    }
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return updatedDomains;
}

// Check if domain is already being tracked
export async function isDomainTracked(userId: string, fullDomain: string): Promise<boolean> {
  const id = `${userId}_${fullDomain.replace(/\./g, '_')}`;
  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, 'tracked_domains'),
      where('id', '==', id)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch {
    return false;
  }
}

// Get tracking statistics for a user
export async function getTrackingStats(userId: string): Promise<{
  total: number;
  expiringSoon: number;
  expired: number;
  available: number;
  active: number;
}> {
  const trackedDomains = await getTrackedDomains(userId);

  return {
    total: trackedDomains.length,
    expiringSoon: trackedDomains.filter(d => d.status === 'expiring-soon').length,
    expired: trackedDomains.filter(d => d.status === 'expired').length,
    available: trackedDomains.filter(d => d.status === 'available').length,
    active: trackedDomains.filter(d => d.status === 'active').length,
  };
}

// Export tracked domains to CSV
export function exportTrackedDomainsCSV(domains: TrackedDomain[]): string {
  const headers = ['Domain', 'TLD', 'Expiry Date', 'Days Until Expiry', 'Status', 'Registrar', 'Last Checked', 'Notes'];
  const rows = domains.map(d => [
    d.domain,
    d.tld,
    d.expiryDate || 'N/A',
    d.daysUntilExpiry?.toString() || 'N/A',
    d.status,
    d.registrar || 'N/A',
    d.lastChecked,
    d.notes || '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
  return csv;
}

// Download CSV
export function downloadTrackedDomainsCSV(domains: TrackedDomain[]): void {
  const csv = exportTrackedDomainsCSV(domains);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `tracked-domains-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
