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
    // Wird in den HTML Dateien implementiert
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

// Globale DB Instanz
const db = new HexenjaegerDB();
