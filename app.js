// Hexenjäger Event Management System
class HexenjaegerDB {
    constructor() {
        this.init();
    }

    init() {
        // Initialisiere Standarddaten falls leer
        if (!localStorage.getItem('hj_members')) {
            this.saveMembers([
                { id: 'HJ001', name: 'Malachi', joined: new Date().toISOString() },
                { id: 'HJ002', name: 'Raven', joined: new Date().toISOString() },
                { id: 'HJ003', name: 'Orion', joined: new Date().toISOString() }
            ]);
        }
        
        if (!localStorage.getItem('hj_events')) {
            this.saveEvents([]);
        }
        
        if (!localStorage.getItem('hj_completed_payouts')) {
            this.saveCompletedPayouts([]);
        }
        
        if (!localStorage.getItem('hj_event_prices')) {
            this.saveEventPrices(this.getDefaultPrices());
        }
    }

    // Standard Event-Preise
    getDefaultPrices() {
        return {
            'bizwar_win': { price: 50000, description: 'Pro Kill (Win)', unit: 'pro Kill' },
            'bizwar_lose': { price: 25000, description: 'Pro Kill (Lose)', unit: 'pro Kill' },
            '40er_win': { price: 40000, description: 'Pro Kill (Win)', unit: 'pro Kill' },
            '40er_lose': { price: 20000, description: 'Pro Kill (Lose)', unit: 'pro Kill' },
            'giesserei': { price: 30000, description: 'Pro Kill', unit: 'pro Kill' },
            'waffenfabrik': { price: 35000, description: 'Pro Kill', unit: 'pro Kill' },
            'hafen': { price: 100000, description: 'Pro Drop', unit: 'pro Drop' },
            'ekz': { price: 150000, description: 'Pro Win', unit: 'pro Win' }
        };
    }

    // Mitglieder-Verwaltung
    getMembers() {
        return JSON.parse(localStorage.getItem('hj_members') || '[]');
    }

    saveMembers(members) {
        localStorage.setItem('hj_members', JSON.stringify(members));
    }

    addMember(name, id) {
        const members = this.getMembers();
        if (members.find(m => m.id === id)) {
            return { error: 'Mitglied mit dieser ID existiert bereits' };
        }
        members.push({ 
            id: id.toUpperCase(), 
            name: name, 
            joined: new Date().toISOString() 
        });
        this.saveMembers(members);
        return { success: true };
    }

    updateMember(id, newName) {
        const members = this.getMembers();
        const memberIndex = members.findIndex(m => m.id === id);
        if (memberIndex === -1) return { error: 'Mitglied nicht gefunden' };
        
        members[memberIndex].name = newName;
        this.saveMembers(members);
        return { success: true };
    }

    deleteMember(id) {
        const members = this.getMembers();
        const memberIndex = members.findIndex(m => m.id === id);
        if (memberIndex === -1) return { error: 'Mitglied nicht gefunden' };
        
        // Prüfe ob Mitglied Events hat
        const events = this.getEvents();
        const hasEvents = events.some(event => event.memberIds.includes(id));
        if (hasEvents) {
            return { error: 'Mitglied kann nicht gelöscht werden, da es Events hat' };
        }
        
        members.splice(memberIndex, 1);
        this.saveMembers(members);
        return { success: true };
    }

    // Event-Verwaltung
    getEvents() {
        return JSON.parse(localStorage.getItem('hj_events') || '[]');
    }

    saveEvents(events) {
        localStorage.setItem('hj_events', JSON.stringify(events));
    }

    addEvent(eventData) {
        try {
            const events = this.getEvents();
            const newEvent = {
                id: Date.now().toString(),
                ...eventData,
                date: new Date().toISOString()
            };
            
            events.push(newEvent);
            this.saveEvents(events);
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Event-Preis Management
    getEventPrices() {
        return JSON.parse(localStorage.getItem('hj_event_prices') || '{}');
    }

    saveEventPrices(prices) {
        localStorage.setItem('hj_event_prices', JSON.stringify(prices));
    }

    getEventPrice(eventType, amount = 1) {
        const prices = this.getEventPrices();
        const eventPrice = prices[eventType];
        return eventPrice && eventPrice.price ? eventPrice.price * amount : 0;
    }

    // Auszahlungs-Management
    getCompletedPayouts() {
        return JSON.parse(localStorage.getItem('hj_completed_payouts') || '[]');
    }

    saveCompletedPayouts(payouts) {
        localStorage.setItem('hj_completed_payouts', JSON.stringify(payouts));
    }

    completePayout(memberId) {
        const events = this.getEvents();
        const completedPayouts = this.getCompletedPayouts();
        
        let totalAmount = 0;
        const memberEvents = events.filter(event => event.memberIds.includes(memberId));
        
        memberEvents.forEach(event => {
            const eventType = event.eventType;
            const amount = event.amount || 1;
            const totalAmountEvent = event.totalAmount || 0;
            
            let calculatedAmount = 0;
            if (['cayo', 'rp_fabrik', 'ekz'].includes(eventType)) {
                calculatedAmount = totalAmountEvent > 0 ? Math.round(totalAmountEvent / event.memberIds.length) : 0;
            } else {
                calculatedAmount = this.getEventPrice(eventType, amount);
            }
            
            totalAmount += calculatedAmount;
        });
        
        const member = this.getMembers().find(m => m.id === memberId);
        if (member && totalAmount > 0) {
            completedPayouts.push({
                memberId: memberId,
                memberName: member.name,
                total: totalAmount,
                completedDate: new Date().toISOString()
            });
            
            this.saveCompletedPayouts(completedPayouts);
            
            // Entferne Events des Mitglieds
            const updatedEvents = events.filter(event => !event.memberIds.includes(memberId));
            this.saveEvents(updatedEvents);
            
            return { success: true, amount: totalAmount };
        }
        
        return { error: 'Mitglied nicht gefunden oder kein Betrag vorhanden' };
    }
}

// In app.js - Passwort-Validierung ersetzen:
async function validatePasswordWithBot(password, userId) {
    try {
        const response = await fetch(`http://localhost:3000/api/validate-password?password=${encodeURIComponent(password)}&userId=${encodeURIComponent(userId)}`);
        if (!response.ok) throw new Error('API nicht erreichbar');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Bot API nicht erreichbar:', error);
        return { valid: false, accessLevel: 'member' };
    }
}

// In der Passwort-Eingabe User ID speichern
function checkPassword() {
    const password = document.getElementById('passwordInput').value.trim().toUpperCase();
    const userId = localStorage.getItem('hj_user_id') || generateTempUserId();
    
    validatePasswordWithBot(password, userId).then(result => {
        if (result.valid) {
            localStorage.setItem('hj_access', password);
            localStorage.setItem('hj_access_time', Date.now());
            localStorage.setItem('hj_user_id', userId);
            localStorage.setItem('hj_access_level', result.accessLevel);
            document.getElementById('passwordOverlay').style.display = 'none';
            accessManager.setAccessLevel(result.accessLevel);
        } else {
            // Fehler anzeigen
        }
    });
}

function generateTempUserId() {
    return 'temp_' + Math.random().toString(36).substr(2, 9);
}

// Zugangslevel Management
class AccessManager {
    constructor() {
        this.accessLevel = 'member'; // Standard: Nur Lesen
    }

    setAccessLevel(level) {
        this.accessLevel = level;
        localStorage.setItem('hj_access_level', level);
        this.applyAccessRestrictions();
    }

    applyAccessRestrictions() {
        const isAdmin = this.accessLevel === 'admin';
        
        // Verstecke/Zeige Elemente basierend auf Zugangslevel
        const adminElements = document.querySelectorAll('[data-admin-only]');
        const memberElements = document.querySelectorAll('[data-member-only]');
        
        adminElements.forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });
        
        // Event-Buttons für Nicht-Admins deaktivieren
        const eventButtons = document.querySelectorAll('#submitEvent, [onclick*="Event"], [onclick*="event"]');
        if (!isAdmin) {
            eventButtons.forEach(btn => {
                btn.style.display = 'none';
            });
        }
    }

    canEdit() {
        return this.accessLevel === 'admin';
    }

    canDelete() {
        return this.accessLevel === 'admin';
    }

    canCreateEvents() {
        return this.accessLevel === 'admin';
    }

    loadAccessLevel() {
        const savedLevel = localStorage.getItem('hj_access_level');
        if (savedLevel) {
            this.accessLevel = savedLevel;
            this.applyAccessRestrictions();
        }
    }
}

// Hilfsfunktionen
function formatCurrency(amount) {
    return '$' + parseInt(amount).toLocaleString('de-DE');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'success') {
    // Erstelle eine Notification falls nicht vorhanden
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback: Einfache Notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
            color: white;
            border-radius: 6px;
            z-index: 10000;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

// Zugangskontrolle für alle Seiten
function checkAccess() {
    const password = localStorage.getItem('hj_access');
    const storedTime = localStorage.getItem('hj_access_time');
    
    if (!password || !storedTime) {
        showPasswordScreen();
        return false;
    }
    
    // Prüfe ob Passwort älter als 24 Stunden
    const timePassed = Date.now() - parseInt(storedTime);
    if (timePassed > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('hj_access');
        localStorage.removeItem('hj_access_time');
        localStorage.removeItem('hj_access_level');
        showPasswordScreen();
        return false;
    }
    
    return true;
}

function showPasswordScreen() {
    // Wird in den HTML Dateien implementiert
    if (typeof window.showPasswordScreen === 'function') {
        window.showPasswordScreen();
    }
}

// Globale Instanzen
const db = new HexenjaegerDB();
const accessManager = new AccessManager();

// Beim Laden der Seite Zugangslevel laden
document.addEventListener('DOMContentLoaded', function() {
    if (checkAccess()) {
        accessManager.loadAccessLevel();
    }
});

// API für andere Seiten
window.HexenjaegerApp = {
    db: db,
    accessManager: accessManager,
    validatePasswordWithBot: validatePasswordWithBot,
    checkAccess: checkAccess
};
