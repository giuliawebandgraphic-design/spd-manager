import { db } from './index.ts';
import * as schema from './schema.ts';
import { eq, desc, asc } from 'drizzle-orm';

export async function getAllStudioData() {
  try {
    const [
      dbClients,
      dbProjects,
      dbTasks,
      dbProofs,
      dbFeedback,
      dbQuotes,
      dbQuoteItems,
      dbInventory,
      dbSettings,
      dbPriceCatalog,
      dbFinancials,
      dbMeetings,
      dbWeeklyAvailability,
    ] = await Promise.all([
      db.select().from(schema.clients),
      db.select().from(schema.projects),
      db.select().from(schema.tasks).orderBy(asc(schema.tasks.sortOrder)),
      db.select().from(schema.proofs).orderBy(desc(schema.proofs.version)),
      db.select().from(schema.proofFeedback).orderBy(asc(schema.proofFeedback.createdAt)),
      db.select().from(schema.quotes),
      db.select().from(schema.quoteItems).orderBy(asc(schema.quoteItems.sortOrder)),
      db.select().from(schema.inventory),
      db.select().from(schema.studioSettings).where(eq(schema.studioSettings.id, 'current')).limit(1),
      db.select().from(schema.priceCatalog).orderBy(asc(schema.priceCatalog.sortOrder)),
      db.select().from(schema.financialRecords).orderBy(desc(schema.financialRecords.date)),
      db.select().from(schema.meetings).orderBy(asc(schema.meetings.date)),
      db.select().from(schema.weeklyAvailability),
    ]);

    // Group tasks, proofs, and feedback by project
    const proofsWithFeedback = dbProofs.map((prf) => ({
      ...prf,
      feedback: dbFeedback.filter((fb) => fb.proofId === prf.id),
    }));

    const projectsWithDetails = dbProjects.map((p) => {
      let parsedEventProducts;
      if (p.eventProducts) {
        try {
          parsedEventProducts = typeof p.eventProducts === 'string' ? JSON.parse(p.eventProducts) : p.eventProducts;
        } catch {
          parsedEventProducts = undefined;
        }
      }
      return {
        ...p,
        eventProducts: parsedEventProducts,
        tasks: dbTasks
          .filter((t) => t.projectId === p.id)
          .map((t) => ({
            ...t,
            hours: Number(t.hours) || 1,
            scheduledDate: t.scheduledDate || undefined,
            scheduledSlot: (t.scheduledSlot as any) || undefined,
            scheduledOwner: (t.scheduledOwner as any) || undefined,
          })),
        proofs: proofsWithFeedback.filter((prf) => prf.projectId === p.id),
      };
    });

    const quotesWithItems = dbQuotes.map((q) => ({
      ...q,
      discount: Number(q.discount) || 0,
      vatRate: Number(q.vatRate) || 22,
      depositPercent: Number(q.depositPercent) || 40,
      items: dbQuoteItems
        .filter((qi) => qi.quoteId === q.id)
        .map((qi) => ({
          ...qi,
          qty: Number(qi.qty) || 1,
          unit: Number(qi.unit) || 0,
        })),
    }));

    const formattedInventory = dbInventory.map((i) => ({
      ...i,
      qty: Number(i.qty) || 0,
      minimum: Number(i.minimum) || 10,
    }));

    const firstSetting = dbSettings[0];
    const formattedSettings = firstSetting
      ? {
          ownerHours: Number(firstSetting.ownerHours) || 30,
          collabHours: Number(firstSetting.collabHours) || 4,
          buffer: Number(firstSetting.buffer) || 20,
          vat: Number(firstSetting.vat) || 22,
          deposit: Number(firstSetting.deposit) || 40,
          gcalSyncEnabled: Boolean(firstSetting.gcalSyncEnabled),
          gcalCalendarId: firstSetting.gcalCalendarId || 'primary',
        }
      : null;

    const formattedPriceCatalog = dbPriceCatalog.map((c) => ({
      ...c,
      price: Number(c.price) || 0,
      minQty: Number(c.minQty) || 1,
      defaultHours: Number(c.defaultHours) || 0,
      description: c.description || '',
    }));

    const formattedFinancials = (dbFinancials || []).map((f) => ({
      ...f,
      amount: Number(f.amount) || 0,
    }));

    const formattedWeeklyAvailability = (dbWeeklyAvailability || []).map((w) => {
      let giuliaDaily;
      let claudiaDaily;
      try { giuliaDaily = w.giuliaDaily ? JSON.parse(w.giuliaDaily) : undefined; } catch {}
      try { claudiaDaily = w.claudiaDaily ? JSON.parse(w.claudiaDaily) : undefined; } catch {}
      return {
        ...w,
        giuliaHours: Number(w.giuliaHours) || 30,
        claudiaHours: Number(w.claudiaHours) || 4,
        giuliaDaily,
        claudiaDaily,
      };
    });

    return {
      clients: dbClients,
      projects: projectsWithDetails,
      quotes: quotesWithItems,
      inventory: formattedInventory,
      settings: formattedSettings,
      priceCatalog: formattedPriceCatalog,
      financials: formattedFinancials,
      meetings: dbMeetings || [],
      weeklyAvailability: formattedWeeklyAvailability,
    };
  } catch (error) {
    console.error('Failed to get studio data from Cloud SQL:', error);
    throw new Error('Database query failed', { cause: error });
  }
}

// Project queries
export async function createProjectRecord(project: any, tasksList: any[] = []) {
  try {
    const existing = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.id, project.id))
      .limit(1);

    const projectValues = {
      id: project.id,
      clientId: (project.clientId && String(project.clientId).trim() !== '') ? project.clientId : null,
      name: project.name || 'Senza Titolo',
      type: project.type || 'eventi',
      eventProducts: project.eventProducts ? JSON.stringify(project.eventProducts) : null,
      status: project.status || 'new',
      priority: project.priority || 'normal',
      owner: project.owner || 'Giulia',
      due: project.due || new Date().toISOString().slice(0, 10),
      eventDate: (project.eventDate && String(project.eventDate).trim() !== '') ? project.eventDate : null,
      notes: project.notes || '',
      driveFolderUrl: project.driveFolderUrl || null,
      approved: Boolean(project.approved),
      approvedAt: project.approvedAt || null,
      approvedBy: project.approvedBy || null,
      createdAt: project.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: project.updatedAt || new Date().toISOString().slice(0, 10),
    };

    if (existing.length > 0) {
      await db.update(schema.projects).set(projectValues).where(eq(schema.projects.id, project.id));
    } else {
      await db.insert(schema.projects).values(projectValues);
    }

    if (tasksList && tasksList.length > 0) {
      for (let idx = 0; idx < tasksList.length; idx++) {
        const t = tasksList[idx];
        if (!t.id) continue;
        const taskValues = {
          id: t.id,
          projectId: project.id,
          name: t.name || 'Fase di lavorazione',
          owner: t.owner || 'Giulia',
          hours: String(Number(t.hours) || 1),
          leadDays: Number(t.leadDays) || 0,
          gate: t.gate || '',
          done: Boolean(t.done),
          doneAt: t.doneAt || null,
          sortOrder: Number(t.sortOrder ?? idx) || idx,
          scheduledDate: t.scheduledDate || null,
          scheduledSlot: t.scheduledSlot || null,
          scheduledOwner: t.scheduledOwner || null,
        };

        const existingTask = await db
          .select({ id: schema.tasks.id })
          .from(schema.tasks)
          .where(eq(schema.tasks.id, t.id))
          .limit(1);

        if (existingTask.length > 0) {
          await db.update(schema.tasks).set(taskValues).where(eq(schema.tasks.id, t.id));
        } else {
          await db.insert(schema.tasks).values(taskValues);
        }
      }
    }
  } catch (error) {
    console.error('Failed to create/upsert project in Cloud SQL:', error);
    throw error;
  }
}

export async function updateProjectRecord(id: string, updates: any) {
  try {
    const sanitized: any = {};
    if (updates.name !== undefined) sanitized.name = updates.name;
    if (updates.clientId !== undefined) {
      sanitized.clientId = (updates.clientId && String(updates.clientId).trim() !== '') ? updates.clientId : null;
    }
    if (updates.type !== undefined) sanitized.type = updates.type;
    if (updates.eventProducts !== undefined) {
      sanitized.eventProducts = updates.eventProducts ? JSON.stringify(updates.eventProducts) : null;
    }
    if (updates.status !== undefined) sanitized.status = updates.status;
    if (updates.priority !== undefined) sanitized.priority = updates.priority;
    if (updates.owner !== undefined) sanitized.owner = updates.owner;
    if (updates.due !== undefined) sanitized.due = updates.due;
    if (updates.eventDate !== undefined) {
      sanitized.eventDate = (updates.eventDate && String(updates.eventDate).trim() !== '') ? updates.eventDate : null;
    }
    if (updates.notes !== undefined) sanitized.notes = updates.notes || '';
    if (updates.driveFolderUrl !== undefined) sanitized.driveFolderUrl = updates.driveFolderUrl || null;
    if (updates.approved !== undefined) sanitized.approved = Boolean(updates.approved);
    if (updates.approvedAt !== undefined) sanitized.approvedAt = updates.approvedAt || null;
    if (updates.approvedBy !== undefined) sanitized.approvedBy = updates.approvedBy || null;
    if (updates.updatedAt !== undefined) sanitized.updatedAt = updates.updatedAt;

    if (Object.keys(sanitized).length > 0) {
      await db.update(schema.projects).set(sanitized).where(eq(schema.projects.id, id));
    }
  } catch (error) {
    console.error('Failed to update project in Cloud SQL:', error);
    throw error;
  }
}

export async function deleteProjectRecord(id: string) {
  try {
    await db.delete(schema.projects).where(eq(schema.projects.id, id));
  } catch (error) {
    console.error('Failed to delete project in Cloud SQL:', error);
    throw error;
  }
}

// Task queries
export async function insertTaskRecord(task: any) {
  try {
    await db.insert(schema.tasks).values({
      id: task.id,
      projectId: task.projectId,
      name: task.name,
      owner: task.owner,
      hours: String(task.hours),
      leadDays: Number(task.leadDays) || 0,
      gate: task.gate || '',
      done: Boolean(task.done),
      doneAt: task.doneAt || null,
      sortOrder: Number(task.sortOrder) || 0,
      scheduledDate: task.scheduledDate || null,
      scheduledSlot: task.scheduledSlot || null,
      scheduledOwner: task.scheduledOwner || null,
    });
  } catch (error) {
    console.error('Failed to insert task in Cloud SQL:', error);
    throw error;
  }
}

export async function updateTaskRecord(id: string, updates: any) {
  try {
    const formatted: any = { ...updates };
    if (formatted.hours !== undefined) formatted.hours = String(formatted.hours);
    if ('scheduledDate' in updates) {
      formatted.scheduledDate = updates.scheduledDate ? updates.scheduledDate : null;
    }
    if ('scheduledSlot' in updates) {
      formatted.scheduledSlot = updates.scheduledSlot ? updates.scheduledSlot : null;
    }
    if ('scheduledOwner' in updates) {
      formatted.scheduledOwner = updates.scheduledOwner ? updates.scheduledOwner : null;
    }
    await db.update(schema.tasks).set(formatted).where(eq(schema.tasks.id, id));
  } catch (error) {
    console.error('Failed to update task in Cloud SQL:', error);
    throw error;
  }
}

export async function deleteTaskRecord(id: string) {
  try {
    await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
  } catch (error) {
    console.error('Failed to delete task in Cloud SQL:', error);
    throw error;
  }
}

// Proof & Feedback queries
export async function insertProofRecord(proof: any) {
  try {
    await db.insert(schema.proofs).values({
      id: proof.id,
      projectId: proof.projectId,
      title: proof.title,
      version: Number(proof.version) || 1,
      fileUrl: proof.fileUrl,
      fileName: proof.fileName,
      fileSize: proof.fileSize || null,
      status: proof.status || 'pending',
      notes: proof.notes || null,
      uploadedBy: proof.uploadedBy,
      uploadedAt: proof.uploadedAt,
    });
  } catch (error) {
    console.error('Failed to insert proof in Cloud SQL:', error);
    throw error;
  }
}

export async function updateProofRecord(id: string, updates: any) {
  try {
    await db.update(schema.proofs).set(updates).where(eq(schema.proofs.id, id));
  } catch (error) {
    console.error('Failed to update proof in Cloud SQL:', error);
    throw error;
  }
}

export async function insertFeedbackRecord(feedback: any) {
  try {
    await db.insert(schema.proofFeedback).values({
      id: feedback.id,
      proofId: feedback.proofId || null,
      projectId: feedback.projectId,
      authorName: feedback.authorName,
      authorRole: feedback.authorRole,
      message: feedback.message,
      createdAt: feedback.createdAt,
    });
  } catch (error) {
    console.error('Failed to insert feedback in Cloud SQL:', error);
    throw error;
  }
}

// Client queries
export async function insertClientRecord(client: any) {
  try {
    const existing = await db
      .select({ id: schema.clients.id })
      .from(schema.clients)
      .where(eq(schema.clients.id, client.id))
      .limit(1);

    const clientValues = {
      id: client.id,
      name: client.name || 'Cliente Senza Nome',
      email: client.email || '',
      phone: client.phone || '',
      type: client.type || 'Privato',
      companyName: client.companyName || null,
      taxId: client.taxId || null,
      notes: client.notes || '',
      portalToken: client.portalToken || ('portal_' + Math.random().toString(36).slice(2, 8)),
      portalPassword: client.portalPassword || null,
      portalEnabled: Boolean(client.portalEnabled ?? true),
      createdAt: client.createdAt || new Date().toISOString().slice(0, 10),
      fiscalType: client.fiscalType || null,
      fiscalCode: client.fiscalCode || null,
      vatNumber: client.vatNumber || null,
      companyLegalName: client.companyLegalName || null,
      sdiCode: client.sdiCode || null,
      pec: client.pec || null,
      billingAddress: client.billingAddress || null,
      billingCap: client.billingCap || null,
      billingCity: client.billingCity || null,
      billingProvince: client.billingProvince || null,
      billingCountry: client.billingCountry || 'Italia',
      billingNotes: client.billingNotes || null,
      fiscalDataCompleted: Boolean(client.fiscalDataCompleted),
      fiscalDataUpdatedAt: client.fiscalDataUpdatedAt || null,
      driveFolderUrl: client.driveFolderUrl || null,
    };

    if (existing.length > 0) {
      await db.update(schema.clients).set(clientValues).where(eq(schema.clients.id, client.id));
    } else {
      await db.insert(schema.clients).values(clientValues);
    }
  } catch (error) {
    console.error('Failed to insert/upsert client in Cloud SQL:', error);
    throw error;
  }
}

export async function updateClientRecord(id: string, updates: any) {
  try {
    const validKeys = [
      'name', 'email', 'phone', 'type', 'companyName', 'taxId', 'notes',
      'portalToken', 'portalPassword', 'portalEnabled', 'fiscalType', 'fiscalCode',
      'vatNumber', 'companyLegalName', 'sdiCode', 'pec', 'billingAddress',
      'billingCap', 'billingCity', 'billingProvince', 'billingCountry', 'billingNotes',
      'fiscalDataCompleted', 'fiscalDataUpdatedAt', 'driveFolderUrl'
    ];
    const sanitized: any = {};
    for (const k of validKeys) {
      if (updates[k] !== undefined) {
        sanitized[k] = updates[k];
      }
    }
    if (Object.keys(sanitized).length > 0) {
      await db.update(schema.clients).set(sanitized).where(eq(schema.clients.id, id));
    }
  } catch (error) {
    console.error('Failed to update client in Cloud SQL:', error);
  }
}

export async function deleteClientRecord(id: string) {
  try {
    await db.delete(schema.clients).where(eq(schema.clients.id, id));
  } catch (error) {
    console.error('Failed to delete client in Cloud SQL:', error);
    throw error;
  }
}

// Quote queries
export async function insertQuoteRecord(quote: any, itemsList: any[] = []) {
  try {
    const existing = await db
      .select({ id: schema.quotes.id })
      .from(schema.quotes)
      .where(eq(schema.quotes.id, quote.id))
      .limit(1);

    const quoteValues = {
      id: quote.id,
      clientId: (quote.clientId && String(quote.clientId).trim() !== '') ? quote.clientId : null,
      projectId: (quote.projectId && String(quote.projectId).trim() !== '') ? quote.projectId : null,
      name: quote.name || 'Preventivo',
      status: quote.status || 'draft',
      discount: String(quote.discount || 0),
      vatRate: String(quote.vatRate || 22),
      depositPercent: String(quote.depositPercent || 40),
      notes: quote.notes || '',
      created: quote.created || new Date().toISOString().slice(0, 10),
    };

    if (existing.length > 0) {
      await db.update(schema.quotes).set(quoteValues).where(eq(schema.quotes.id, quote.id));
    } else {
      await db.insert(schema.quotes).values(quoteValues);
    }

    if (itemsList && itemsList.length > 0) {
      await db.delete(schema.quoteItems).where(eq(schema.quoteItems.quoteId, quote.id));
      await db.insert(schema.quoteItems).values(
        itemsList.map((it, idx) => ({
          id: it.id || ('qi_' + Math.random().toString(36).slice(2, 8)),
          quoteId: quote.id,
          name: it.name,
          qty: String(it.qty || 1),
          unit: String(it.unit || 0),
          sortOrder: idx,
        }))
      );
    }
  } catch (error) {
    console.error('Failed to insert quote in Cloud SQL:', error);
    throw error;
  }
}

export async function updateQuoteRecord(id: string, updates: any, itemsList?: any[]) {
  try {
    const formatted: any = { ...updates };
    delete formatted.items; // Strip nested items array before updating quotes table
    if (formatted.clientId !== undefined) {
      formatted.clientId = (formatted.clientId && String(formatted.clientId).trim() !== '') ? formatted.clientId : null;
    }
    if (formatted.projectId !== undefined) {
      formatted.projectId = (formatted.projectId && String(formatted.projectId).trim() !== '') ? formatted.projectId : null;
    }
    if (formatted.discount !== undefined) formatted.discount = String(formatted.discount);
    if (formatted.vatRate !== undefined) formatted.vatRate = String(formatted.vatRate);
    if (formatted.depositPercent !== undefined) formatted.depositPercent = String(formatted.depositPercent);

    if (Object.keys(formatted).length > 0) {
      await db.update(schema.quotes).set(formatted).where(eq(schema.quotes.id, id));
    }

    if (itemsList) {
      await db.delete(schema.quoteItems).where(eq(schema.quoteItems.quoteId, id));
      if (itemsList.length > 0) {
        await db.insert(schema.quoteItems).values(
          itemsList.map((it, idx) => ({
            id: it.id || ('qi_' + Math.random().toString(36).slice(2, 8)),
            quoteId: id,
            name: it.name,
            qty: String(it.qty || 1),
            unit: String(it.unit || 0),
            sortOrder: idx,
          }))
        );
      }
    }
  } catch (error) {
    console.error('Failed to update quote in Cloud SQL:', error);
    throw error;
  }
}

export async function deleteQuoteRecord(id: string) {
  try {
    await db.delete(schema.quotes).where(eq(schema.quotes.id, id));
  } catch (error) {
    console.error('Failed to delete quote in Cloud SQL:', error);
    throw error;
  }
}

// Inventory queries
export async function insertInventoryRecord(item: any) {
  try {
    await db.insert(schema.inventory).values({
      id: item.id,
      name: item.name,
      unit: item.unit || 'pz',
      qty: String(item.qty || 0),
      minimum: String(item.minimum || 10),
      supplier: item.supplier || null,
    });
  } catch (error) {
    console.error('Failed to insert inventory item in Cloud SQL:', error);
    throw error;
  }
}

export async function updateInventoryRecord(id: string, updates: any) {
  try {
    const formatted: any = { ...updates };
    if (formatted.qty !== undefined) formatted.qty = String(formatted.qty);
    if (formatted.minimum !== undefined) formatted.minimum = String(formatted.minimum);
    await db.update(schema.inventory).set(formatted).where(eq(schema.inventory.id, id));
  } catch (error) {
    console.error('Failed to update inventory item in Cloud SQL:', error);
    throw error;
  }
}

export async function deleteInventoryRecord(id: string) {
  try {
    await db.delete(schema.inventory).where(eq(schema.inventory.id, id));
  } catch (error) {
    console.error('Failed to delete inventory in Cloud SQL:', error);
    throw error;
  }
}

// Settings
export async function updateStudioSettingsRecord(updates: any) {
  try {
    const formatted: any = {};
    if (updates.ownerHours !== undefined) formatted.ownerHours = String(updates.ownerHours);
    if (updates.collabHours !== undefined) formatted.collabHours = String(updates.collabHours);
    if (updates.buffer !== undefined) formatted.buffer = String(updates.buffer);
    if (updates.vat !== undefined) formatted.vat = String(updates.vat);
    if (updates.deposit !== undefined) formatted.deposit = String(updates.deposit);
    if (updates.gcalSyncEnabled !== undefined) formatted.gcalSyncEnabled = Boolean(updates.gcalSyncEnabled);
    if (updates.gcalCalendarId !== undefined) formatted.gcalCalendarId = updates.gcalCalendarId;

    await db
      .insert(schema.studioSettings)
      .values({ id: 'current', ...formatted })
      .onConflictDoUpdate({
        target: schema.studioSettings.id,
        set: formatted,
      });
  } catch (error) {
    console.error('Failed to update studio settings in Cloud SQL:', error);
    throw error;
  }
}

// Price Catalog Queries
export async function insertPriceCatalogRecord(item: any) {
  try {
    await db.insert(schema.priceCatalog).values({
      id: item.id,
      name: item.name,
      price: String(item.price || 0),
      category: item.category || 'Wedding Suite',
      description: item.description || '',
      minQty: String(item.minQty || 1),
      defaultHours: String(item.defaultHours || 0),
      sortOrder: Number(item.sortOrder) || 0,
    });
  } catch (error) {
    console.error('Failed to insert price catalog item in Cloud SQL:', error);
    throw error;
  }
}

export async function updatePriceCatalogRecord(id: string, updates: any) {
  try {
    const formatted: any = { ...updates };
    if (formatted.price !== undefined) formatted.price = String(formatted.price);
    if (formatted.minQty !== undefined) formatted.minQty = String(formatted.minQty);
    if (formatted.defaultHours !== undefined) formatted.defaultHours = String(formatted.defaultHours);

    await db.update(schema.priceCatalog).set(formatted).where(eq(schema.priceCatalog.id, id));
  } catch (error) {
    console.error('Failed to update price catalog item in Cloud SQL:', error);
    throw error;
  }
}

export async function deletePriceCatalogRecord(id: string) {
  try {
    await db.delete(schema.priceCatalog).where(eq(schema.priceCatalog.id, id));
  } catch (error) {
    console.error('Failed to delete price catalog item in Cloud SQL:', error);
    throw error;
  }
}

// Financial Records Queries (Entrate, Spese, Bilancio)
export async function insertFinancialRecord(record: any) {
  try {
    await db.insert(schema.financialRecords).values({
      id: record.id,
      projectId: record.projectId || null,
      type: record.type || 'expense',
      category: record.category || 'materials',
      title: record.title,
      amount: String(record.amount || 0),
      date: record.date,
      status: record.status || 'paid',
      supplierOrClient: record.supplierOrClient || null,
      notes: record.notes || '',
      invoiceNumber: record.invoiceNumber || null,
      createdAt: record.createdAt,
    });
  } catch (error) {
    console.error('Failed to insert financial record in Cloud SQL:', error);
    throw error;
  }
}

export async function updateFinancialRecord(id: string, updates: any) {
  try {
    const formatted: any = { ...updates };
    if (formatted.amount !== undefined) formatted.amount = String(formatted.amount);
    await db.update(schema.financialRecords).set(formatted).where(eq(schema.financialRecords.id, id));
  } catch (error) {
    console.error('Failed to update financial record in Cloud SQL:', error);
    throw error;
  }
}

export async function deleteFinancialRecord(id: string) {
  try {
    await db.delete(schema.financialRecords).where(eq(schema.financialRecords.id, id));
  } catch (error) {
    console.error('Failed to delete financial record in Cloud SQL:', error);
    throw error;
  }
}

// Meetings & Couples Consultation Queries (Incontri Sposi)
export async function insertMeetingRecord(meeting: any) {
  try {
    const formatted = {
      id: meeting.id,
      projectId: (meeting.projectId && String(meeting.projectId).trim() !== '') ? meeting.projectId : null,
      clientId: (meeting.clientId && String(meeting.clientId).trim() !== '') ? meeting.clientId : null,
      title: meeting.title || 'Incontro Sposi',
      date: meeting.date || new Date().toISOString().slice(0, 10),
      startTime: meeting.startTime || '10:00',
      endTime: meeting.endTime || '11:00',
      locationType: meeting.locationType || 'studio',
      locationDetails: meeting.locationDetails || '',
      status: meeting.status || 'scheduled',
      attendees: meeting.attendees || '',
      notes: meeting.notes || '',
      decisions: meeting.decisions || '',
      actionItems: meeting.actionItems || '',
      googleCalendarEventId: meeting.googleCalendarEventId || null,
      googleCalendarLink: meeting.googleCalendarLink || null,
      createdAt: meeting.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: meeting.updatedAt || new Date().toISOString().slice(0, 10),
    };

    await db
      .insert(schema.meetings)
      .values(formatted)
      .onConflictDoUpdate({
        target: schema.meetings.id,
        set: formatted,
      });
  } catch (error) {
    console.error('Failed to insert meeting record in Cloud SQL:', error);
    throw error;
  }
}

export async function updateMeetingRecord(id: string, updates: any) {
  try {
    const formatted: any = {
      ...updates,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    if (formatted.projectId === '') formatted.projectId = null;
    if (formatted.clientId === '') formatted.clientId = null;

    await db.update(schema.meetings).set(formatted).where(eq(schema.meetings.id, id));
  } catch (error) {
    console.error('Failed to update meeting record in Cloud SQL:', error);
    throw error;
  }
}

export async function deleteMeetingRecord(id: string) {
  try {
    await db.delete(schema.meetings).where(eq(schema.meetings.id, id));
  } catch (error) {
    console.error('Failed to delete meeting record in Cloud SQL:', error);
    throw error;
  }
}

// Weekly Availability Plan Queries
export async function upsertWeeklyAvailabilityRecord(item: any) {
  try {
    const formatted = {
      id: item.id, // e.g. "2026-W44"
      weekStart: item.weekStart,
      giuliaHours: String(item.giuliaHours ?? 30),
      claudiaHours: String(item.claudiaHours ?? 4),
      giuliaDaily: item.giuliaDaily ? JSON.stringify(item.giuliaDaily) : null,
      claudiaDaily: item.claudiaDaily ? JSON.stringify(item.claudiaDaily) : null,
      notes: item.notes || '',
    };

    await db
      .insert(schema.weeklyAvailability)
      .values(formatted)
      .onConflictDoUpdate({
        target: schema.weeklyAvailability.id,
        set: formatted,
      });
  } catch (error) {
    console.error('Failed to upsert weekly availability in Cloud SQL:', error);
    throw error;
  }
}


