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
    ]);

    // Group tasks, proofs, and feedback by project
    const proofsWithFeedback = dbProofs.map((prf) => ({
      ...prf,
      feedback: dbFeedback.filter((fb) => fb.proofId === prf.id),
    }));

    const projectsWithDetails = dbProjects.map((p) => ({
      ...p,
      tasks: dbTasks
        .filter((t) => t.projectId === p.id)
        .map((t) => ({
          ...t,
          hours: Number(t.hours) || 1,
        })),
      proofs: proofsWithFeedback.filter((prf) => prf.projectId === p.id),
    }));

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

    return {
      clients: dbClients,
      projects: projectsWithDetails,
      quotes: quotesWithItems,
      inventory: formattedInventory,
      settings: formattedSettings,
      priceCatalog: formattedPriceCatalog,
      financials: formattedFinancials,
    };
  } catch (error) {
    console.error('Failed to get studio data from Cloud SQL:', error);
    throw new Error('Database query failed', { cause: error });
  }
}

// Project queries
export async function createProjectRecord(project: any, tasksList: any[] = []) {
  try {
    await db.insert(schema.projects).values({
      id: project.id,
      clientId: project.clientId || null,
      name: project.name,
      type: project.type,
      status: project.status,
      priority: project.priority,
      owner: project.owner,
      due: project.due,
      eventDate: project.eventDate || null,
      notes: project.notes || '',
      approved: Boolean(project.approved),
      approvedAt: project.approvedAt || null,
      approvedBy: project.approvedBy || null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });

    if (tasksList.length > 0) {
      await db.insert(schema.tasks).values(
        tasksList.map((t, idx) => ({
          id: t.id,
          projectId: project.id,
          name: t.name,
          owner: t.owner,
          hours: String(t.hours),
          leadDays: Number(t.leadDays) || 0,
          gate: t.gate || '',
          done: Boolean(t.done),
          doneAt: t.doneAt || null,
          sortOrder: idx,
        }))
      );
    }
  } catch (error) {
    console.error('Failed to create project in Cloud SQL:', error);
    throw error;
  }
}

export async function updateProjectRecord(id: string, updates: any) {
  try {
    await db.update(schema.projects).set(updates).where(eq(schema.projects.id, id));
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
    });
  } catch (error) {
    console.error('Failed to insert task in Cloud SQL:', error);
    throw error;
  }
}

export async function updateTaskRecord(id: string, updates: any) {
  try {
    const formatted = { ...updates };
    if (formatted.hours !== undefined) formatted.hours = String(formatted.hours);
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
    await db.insert(schema.clients).values({
      id: client.id,
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      type: client.type || 'Privato',
      companyName: client.companyName || null,
      taxId: client.taxId || null,
      notes: client.notes || '',
      portalToken: client.portalToken,
      portalPassword: client.portalPassword || null,
      portalEnabled: Boolean(client.portalEnabled),
      createdAt: client.createdAt,
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
    });
  } catch (error) {
    console.error('Failed to insert client in Cloud SQL:', error);
    throw error;
  }
}

export async function updateClientRecord(id: string, updates: any) {
  try {
    await db.update(schema.clients).set(updates).where(eq(schema.clients.id, id));
  } catch (error) {
    console.error('Failed to update client in Cloud SQL:', error);
    // Don't throw so local operations continue reliably
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
    await db.insert(schema.quotes).values({
      id: quote.id,
      clientId: quote.clientId || null,
      projectId: quote.projectId || null,
      name: quote.name,
      status: quote.status || 'draft',
      discount: String(quote.discount || 0),
      vatRate: String(quote.vatRate || 22),
      depositPercent: String(quote.depositPercent || 40),
      notes: quote.notes || '',
      created: quote.created,
    });

    if (itemsList.length > 0) {
      await db.insert(schema.quoteItems).values(
        itemsList.map((it, idx) => ({
          id: it.id,
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
    if (formatted.discount !== undefined) formatted.discount = String(formatted.discount);
    if (formatted.vatRate !== undefined) formatted.vatRate = String(formatted.vatRate);
    if (formatted.depositPercent !== undefined) formatted.depositPercent = String(formatted.depositPercent);

    await db.update(schema.quotes).set(formatted).where(eq(schema.quotes.id, id));

    if (itemsList) {
      await db.delete(schema.quoteItems).where(eq(schema.quoteItems.quoteId, id));
      if (itemsList.length > 0) {
        await db.insert(schema.quoteItems).values(
          itemsList.map((it, idx) => ({
            id: it.id,
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


