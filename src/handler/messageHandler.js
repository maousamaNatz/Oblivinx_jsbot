async function handleUnban(sock, msg, userId) {
  try {
    // Log input awal
    console.log("=== UNBAN PROCESS START ===");
    console.log("Original userId:", userId);

    // Normalisasi format nomor telepon
    let normalizedUserId = userId;

    // Hapus @s.whatsapp.net jika ada
    normalizedUserId = normalizedUserId.replace("@s.whatsapp.net", "");
    normalizedUserId = normalizedUserId.replace("+", "");

    if (normalizedUserId.startsWith("08")) {
      normalizedUserId = "62" + normalizedUserId.slice(1);
    }

    console.log("Normalized userId:", normalizedUserId);

    // 1. Unban dari database
    console.log("Attempting database unban...");
    const unbanResult = await unbanUser(normalizedUserId);
    console.log("Database unban result:", unbanResult);

    if (!unbanResult.success) {
      console.log("Unban failed:", unbanResult.message);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ ${unbanResult.message}`,
      });
      return;
    }

    // 2. Unblock di WhatsApp
    console.log("Attempting WhatsApp unblock...");
    try {
      const whatsappId = `${normalizedUserId}@s.whatsapp.net`;
      console.log("WhatsApp ID for unblock:", whatsappId);
      await sock.updateBlockStatus(whatsappId, "unblock");
      console.log("WhatsApp unblock successful");
    } catch (blockError) {
      console.error("WhatsApp unblock error:", blockError);
      console.log("Full error object:", JSON.stringify(blockError, null, 2));
    }

    // 3. Kirim pesan sukses
    const successMessage =
      `✅ Berhasil mengunban user ${normalizedUserId}\n` +
      `Status: ${
        unbanResult.wasUnbanned
          ? "Diunban dari database"
          : "Sudah tidak dibanned"
      }`;
    console.log("Sending success message:", successMessage);

    await sock.sendMessage(msg.key.remoteJid, {
      text: successMessage,
    });

    console.log("=== UNBAN PROCESS COMPLETE ===");
  } catch (error) {
    console.error("=== UNBAN ERROR ===");
    console.error("Error type:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", JSON.stringify(error, null, 2));

    await sock.sendMessage(msg.key.remoteJid, {
      text:
        "❌ Terjadi kesalahan saat melakukan unban:\n" +
        `Type: ${error.name}\n` +
        `Message: ${error.message}`,
    });
  }
}
// Tambahkan fungsi untuk handle timeout secara global
function setupGlobalErrorHandlers() {
  process.on("unhandledRejection", (reason, promise) => {
    if (reason.message.includes("Timed Out")) {
      botLogger.warning("Timeout detected, attempting to reconnect...");
      if (!global.isConnected && retryCount < MAX_RETRIES) {
        setTimeout(async () => {
          try {
            await startConnection();
          } catch (error) {
            botLogger.error(`Failed to reconnect: ${error.message}`);
          }
        }, RETRY_INTERVAL);
      }
    } else {
      botLogger.error(
        "Unhandled rejection at " + promise + " reason: " + reason
      );
    }
  });
}
async function unbanUser(userId) {
  try {
    const cleanUserId = userId.split("@")[0];

    // Cek apakah user ada di database banned
    const [checkBan] = await pool.execute(
      "SELECT is_banned FROM users WHERE user_id = ? AND is_banned = 1",
      [cleanUserId]
    );

    if (checkBan.length === 0) {
      throw new Error("User tidak dalam keadaan banned");
    }
    // Update kolom is_banned di tabel users
    await pool.execute(
      "UPDATE users SET is_banned = 0 WHERE user_id = ?",
      [cleanUserId]
    );

    // Jika user diblokir karena CALL_BAN, buka blokirnya
    if (checkBan[0].ban_type === BAN_TYPES.CALL) {
      const jid = cleanUserId + "@s.whatsapp.net";
      await sock.updateBlockStatus(jid, "unblock");
      console.log(`User ${cleanUserId} unblocked successfully`);
    }

    // Log untuk debugging
    console.log(`Unban process for ${cleanUserId}:`, {
      banRecord: checkBan[0],
      deleteResult: result,
    });

    return {
      success: true,
      message: `Berhasil unban user ${cleanUserId}`,
      previousBanType: checkBan[0].ban_type,
    };
  } catch (error) {
    console.error(`Error in unbanUser: ${error.message}`);
    throw error;
  }
}
module.exports = {
  setupGlobalErrorHandlers,
  unbanUser,
  handleUnban
};
