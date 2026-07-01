import * as SQLite from 'expo-sqlite';
import {supabase} from '../utils/supabase';

let dbPromise = null;

const getDb = async () => {
  if (!dbPromise) {
    dbPromise = await SQLite.openDatabaseAsync('expenses.db');
  }
  return dbPromise;
};

export const syncTransactionsFromCloud = async (userId) => {
  try{
    const {data: cloudData, error} = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId);

    if(error) {
      console.error("Cloud fetch error:", error);
      return;
    }
    if(!cloudData || cloudData.length === 0) return;

    const db = await getDb();
    await db.runAsync('DELETE FROM transactions WHERE user_id = ?', [userId]);

    for (const item of cloudData) {
      await db.runAsync(
        'INSERT INTO transactions (user_id, title, amount, date, category, payment_mode, receipt_uri) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          userId, 
          item.title, 
          item.amount, 
          item.date, 
          item.category, 
          item.payment_mode || 'Card', 
          item.receipt_url || null // Map cloud 'receipt_url' to local 'receipt_uri'
        ]
      );
    }
    // console.log(`✅ Synced ${cloudData.length} transactions from cloud to local device.`);
  }
  catch(error){
    console.error("Error syncing from cloud:", error);
  }
}

export const initDatabase = async () => {
  try {
    const db = await getDb();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        receipt_uri TEXT
      );
    `);

    try{
      await db.execAsync(`ALTER TABLE transactions ADD COLUMN payment_mode TEXT DEFAULT 'Card';`);
      console.log("Database schema upgraded with payment_mode.");
    }catch(e){
    }

    try {
      await db.execAsync(`ALTER TABLE transactions ADD COLUMN user_id TEXT;`);
      console.log("Database schema upgraded with user_id.");
    } catch(e){}
    return true;
  } 
  catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
};

export const addTransaction = async (userId, title, amount, date, category, payment_mode, receipt_uri = null) => {
  try {
    const db = await getDb();
    const result = await db.runAsync(
      'INSERT INTO transactions (user_id, title, amount, date, category, payment_mode, receipt_uri) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, title, amount, date, category, payment_mode, receipt_uri]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error adding transaction:", error);
    throw error;
  }
};

export const getTransactions = async (userId) => {
  try {
    const db = await getDb();
    const allRows = await db.getAllAsync('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', 
      [userId]
    );
    return allRows;
  }
  catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
};

export const deleteTransaction = async (id) => {
  try {
    const db = await getDb();
    await db.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
    return true;
  }
  catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};