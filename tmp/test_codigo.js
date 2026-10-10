/**
 * FINANCE AI — Google Apps Script Web App
 * Sincronización de facturas en Google Sheets y archivado automático en Google Drive
 * para "Dulce Capricho"
 */

function autorizarPermisosDrive() {
  try {
    var rootFolders = DriveApp.getFoldersByName("Facturas Dulce Capricho");
    var folder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("Facturas Dulce Capricho");
    Logger.log("✅ Permisos de Google Drive autorizados con éxito.");
    Logger.log("Carpeta principal disponible: " + folder.getName() + " (ID: " + folder.getId() + ")");
    return "OK: Permisos concedidos. Carpeta: " + folder.getName();
  } catch (err) {
    Logger.log("❌ Error en autorización de Drive: " + err);
    throw err;
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "ping";
  if (action === "getFacturas" || action === "readFacturas") {
    return handleGetFacturas(e && e.parameter && e.parameter.sheetId, (e && e.parameter && e.parameter.tab) || "Facturas");
  }
  if (action === "deleteInvoice") {
    return handleDeleteInvoice({
      idFactura: (e && e.parameter && e.parameter.idFactura) || "",
      sheetId: (e && e.parameter && e.parameter.sheetId) || "",
      tab: (e && e.parameter && e.parameter.tab) || "Facturas",
      fileUrl: (e && e.parameter && e.parameter.fileUrl) || "",
      driveFolderId: (e && e.parameter && e.parameter.driveFolderId) || "",
      nombreProveedor: (e && e.parameter && e.parameter.nombreProveedor) || ""
    });
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Google Apps Script activo y listo para sincronizar con Finance AI y Google Drive",
    tab: "Facturas"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var tabName = data.tab || "Facturas";

    // 1. Lectura de facturas existentes en la hoja
    if (data.action === "getFacturas" || data.action === "readFacturas" || data.action === "getInvoices") {
      return handleGetFacturas(data.sheetId, tabName);
    }
    
    // 2. Ping de verificación y estado de Google Drive
    if (data.action === "ping") {
      var driveMsg = "Google Drive listo";
      var driveAuthorized = false;
      try {
        if (data.driveFolderId && String(data.driveFolderId).trim() !== "") {
          var fId = extractDriveFolderId(data.driveFolderId);
          var tf = DriveApp.getFolderById(fId);
          driveMsg = "Carpeta configurada de Drive: " + tf.getName();
          driveAuthorized = true;
        } else {
          var rootFolders = DriveApp.getFoldersByName("Facturas Dulce Capricho");
          var f = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("Facturas Dulce Capricho");
          driveMsg = "Carpeta \"Facturas Dulce Capricho\" verificada en tu Google Drive";
          driveAuthorized = true;
        }
      } catch(fErr) {
        driveMsg = "Aviso Google Drive (requiere autorización en el editor): " + fErr.toString();
        driveAuthorized = false;
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Conexión activa con Google Sheets y Google Drive",
        driveStatus: driveMsg,
        driveAuthorized: driveAuthorized
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 3. Eliminar factura de forma coordinada de Google Sheets y Google Drive
    if (data.action === "deleteInvoice") {
      return handleDeleteInvoice(data);
    }

    // 4. Guardar sólo en Google Drive
    if (data.action === "saveToDrive") {
      var directDrive = guardarFacturaEnDrive(data);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", drive: directDrive }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = (data.sheetId && String(data.sheetId).trim().length > 10)
      ? SpreadsheetApp.openById(String(data.sheetId).trim())
      : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName);
    
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow([
        "ID Factura", "Fecha de Emisión", "ID Proveedor", "Concepto",
        "Importe", "Fecha de Vencimiento", "Estado", "Fecha de Pago",
        "Base imponible", "Tipo/s de IVA", "Cuota IVA", "Total", "Categoría de gasto", "Enlace Google Drive"
      ]);
    }

    // 5. Inserción de factura y guardado en Google Drive
    if (data.action === "appendInvoice" || data.action === "saveInvoice" || data.action === "addInvoice") {
      var driveResult = null;
      if (data.archivo && data.archivo.base64) {
        driveResult = guardarFacturaEnDrive({
          driveFolderId: data.driveFolderId,
          nombreProveedor: data.nombreProveedor || (data.row ? data.row[2] : "Varios"),
          idFactura: data.idFactura || (data.row ? data.row[0] : "FAC"),
          fechaEmision: data.fechaEmision || (data.row ? data.row[1] : ""),
          archivo: data.archivo
        });
      } else {
        driveResult = {
          success: false,
          error: "No se recibieron datos binarios del archivo (base64 no adjunto)"
        };
      }

      if (data.row) {
        var rowData = data.row.slice();
        if (driveResult && driveResult.fileUrl) {
          rowData.push(driveResult.fileUrl);
        }
        sheet.appendRow(rowData);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: (driveResult && driveResult.success) ? "success" : "partial",
        message: (driveResult && driveResult.success)
          ? "Factura registrada en Google Sheets y guardada en Google Drive"
          : "Factura registrada en Google Sheets (Aviso Drive: " + ((driveResult && driveResult.error) || "Sin archivo") + ")",
        drive: driveResult
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ignored", action: data.action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleDeleteInvoice(data) {
  try {
    var idToDelete = String(data.idFactura || "").trim();
    var tabName = data.tab || "Facturas";
    var ss = (data.sheetId && String(data.sheetId).trim().length > 10)
      ? SpreadsheetApp.openById(String(data.sheetId).trim())
      : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName);
    
    var deletedSheet = false;
    var fileUrlFound = String(data.fileUrl || "").trim();
    
    if (sheet && idToDelete) {
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow > 1) {
        var range = sheet.getRange(2, 1, lastRow - 1, Math.max(lastCol, 1));
        var values = range.getValues();
        var displayValues = range.getDisplayValues();
        
        for (var r = values.length - 1; r >= 0; r--) {
          var cellVal = String(values[r][0] || "").trim();
          var cellDisplay = String(displayValues[r][0] || "").trim();
          
          var isMatch = (cellVal === idToDelete || cellDisplay === idToDelete ||
                         cellVal.toLowerCase() === idToDelete.toLowerCase() ||
                         cellDisplay.toLowerCase() === idToDelete.toLowerCase());
          
          if (!isMatch && idToDelete.length >= 3) {
            if (cellVal.indexOf(idToDelete) !== -1 || cellDisplay.indexOf(idToDelete) !== -1 ||
                idToDelete.indexOf(cellVal) !== -1 || idToDelete.indexOf(cellDisplay) !== -1) {
              isMatch = true;
            }
          }
          
          if (isMatch) {
            for (var c = 0; c < values[r].length; c++) {
              var val = String(values[r][c] || "");
              if (val.indexOf("drive.google.com") !== -1) {
                fileUrlFound = val;
              }
            }
            sheet.deleteRow(r + 2);
            deletedSheet = true;
          }
        }
      }
    }

    var deletedDrive = eliminarFacturaDeDrive(idToDelete, fileUrlFound, data.driveFolderId, data.nombreProveedor);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      deleted: deletedSheet,
      deletedSheet: deletedSheet,
      deletedDrive: deletedDrive,
      idFactura: idToDelete
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      deleted: false,
      deletedSheet: false,
      deletedDrive: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function guardarFacturaEnDrive(params) {
  try {
    if (!params || !params.archivo || !params.archivo.base64) {
      return {
        success: false,
        error: "No se proporcionó contenido del archivo (base64 vacío)"
      };
    }

    var rawFolderId = params.driveFolderId;
    var carpetaPadre = null;

    if (rawFolderId && String(rawFolderId).trim() !== "") {
      var folderId = extractDriveFolderId(rawFolderId);
      try {
        carpetaPadre = DriveApp.getFolderById(folderId);
      } catch (err) {
        Logger.log("Aviso: no se pudo abrir la carpeta por ID: " + err);
      }
    }

    if (!carpetaPadre) {
      var rootFolders = DriveApp.getFoldersByName("Facturas Dulce Capricho");
      carpetaPadre = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("Facturas Dulce Capricho");
    }

    var nombreProveedor = (params.nombreProveedor || "Proveedores Varios").toString().trim();
    if (!nombreProveedor) nombreProveedor = "Proveedores Varios";

    var subCarpetas = carpetaPadre.getFoldersByName(nombreProveedor);
    var carpetaProveedor;

    if (subCarpetas.hasNext()) {
      carpetaProveedor = subCarpetas.next();
    } else {
      carpetaProveedor = carpetaPadre.createFolder(nombreProveedor);
    }

    var originalName = (params.archivo && params.archivo.nombre) || "factura.pdf";
    var extension = ".pdf";
    var dotIdx = originalName.lastIndexOf(".");
    if (dotIdx !== -1) {
      extension = originalName.substring(dotIdx);
    }

    var idFactura = (params.idFactura || "FAC").toString().trim();
    var fechaEmision = (params.fechaEmision || Utilities.formatDate(new Date(), "GMT+1", "yyyy-MM-dd")).toString().trim();
    var nuevoNombreArchivo = idFactura + " " + fechaEmision + extension;

    var base64Limpio = params.archivo.base64;
    var commaIdx = base64Limpio.indexOf(",");
    if (commaIdx !== -1) {
      base64Limpio = base64Limpio.substring(commaIdx + 1);
    }

    var bytesDecodificados = Utilities.base64Decode(base64Limpio);
    var mimeType = (params.archivo && params.archivo.mimeType) || "application/pdf";
    var blob = Utilities.newBlob(bytesDecodificados, mimeType, nuevoNombreArchivo);

    var archivoDrive = carpetaProveedor.createFile(blob);

    try {
      archivoDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      Logger.log("Aviso al configurar visibilidad pública: " + shareErr);
    }

    return {
      success: true,
      fileId: archivoDrive.getId(),
      fileName: nuevoNombreArchivo,
      fileUrl: archivoDrive.getUrl(),
      carpetaProveedor: nombreProveedor,
      carpetaId: carpetaProveedor.getId(),
      carpetaUrl: carpetaProveedor.getUrl()
    };
  } catch (err) {
    Logger.log("Error en guardarFacturaEnDrive: " + err);
    return {
      success: false,
      error: err.toString()
    };
  }
}

function eliminarFacturaDeDrive(idFactura, fileUrl, rawFolderId, nombreProveedor) {
  var deleted = false;
  try {
    if (fileUrl && fileUrl.indexOf("drive.google.com") !== -1) {
      var fileId = "";
      var matchD = fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (matchD && matchD[1]) {
        fileId = matchD[1];
      } else {
        var matchId = fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (matchId && matchId[1]) {
          fileId = matchId[1];
        }
      }
      if (fileId) {
        try {
          var targetFile = DriveApp.getFileById(fileId);
          if (targetFile) {
            targetFile.setTrashed(true);
            deleted = true;
            Logger.log("✅ Archivo enviado a la papelera por ID: " + fileId);
          }
        } catch (e) {
          Logger.log("Aviso al borrar archivo por URL directa: " + e);
        }
      }
    }

    if (!deleted && idFactura) {
      var carpetas = [];
      if (rawFolderId && String(rawFolderId).trim() !== "") {
        try {
          var fId = extractDriveFolderId(rawFolderId);
          if (fId) carpetas.push(DriveApp.getFolderById(fId));
        } catch(e) {}
      }
      try {
        var rootFolders = DriveApp.getFoldersByName("Facturas Dulce Capricho");
        while (rootFolders.hasNext()) {
          carpetas.push(rootFolders.next());
        }
      } catch(e) {}

      for (var k = 0; k < carpetas.length; k++) {
        var cPadre = carpetas[k];
        var subFolders = cPadre.getFolders();
        while (subFolders.hasNext()) {
          var subF = subFolders.next();
          var provMatch = !nombreProveedor || subF.getName().toLowerCase().indexOf(nombreProveedor.toLowerCase()) !== -1 || nombreProveedor.toLowerCase().indexOf(subF.getName().toLowerCase()) !== -1;
          if (provMatch) {
            var files = subF.getFiles();
            while (files.hasNext()) {
              var f = files.next();
              var fName = f.getName();
              if (fName.indexOf(idFactura) !== -1) {
                f.setTrashed(true);
                deleted = true;
                Logger.log("✅ Archivo enviado a papelera en subcarpeta " + subF.getName() + ": " + fName);
              }
            }
          }
        }
        
        var rootFiles = cPadre.getFiles();
        while (rootFiles.hasNext()) {
          var rf = rootFiles.next();
          if (rf.getName().indexOf(idFactura) !== -1) {
            rf.setTrashed(true);
            deleted = true;
          }
        }
      }
    }

    if (!deleted && idFactura) {
      try {
        var cleanId = idFactura.replace(/["'\\]/g, "");
        if (cleanId.length >= 2) {
          var filesSearch = DriveApp.searchFiles("title contains '" + cleanId + "' and trashed = false");
          while (filesSearch.hasNext()) {
            var sf = filesSearch.next();
            if (sf.getName().indexOf(idFactura) !== -1) {
              sf.setTrashed(true);
              deleted = true;
            }
          }
        }
      } catch (searchErr) {
        Logger.log("Aviso en búsqueda global: " + searchErr);
      }
    }
  } catch (err) {
    Logger.log("Error en eliminarFacturaDeDrive: " + err);
  }
  return deleted;
}

function extractDriveFolderId(input) {
  if (!input) return "";
  var str = input.toString().trim();
  if (str.indexOf("folders/") !== -1) {
    var folderPart = str.split("folders/")[1];
    return folderPart.split("/")[0].split("?")[0].trim();
  }
  if (str.indexOf("id=") !== -1) {
    var idPart = str.split("id=")[1];
    return idPart.split("&")[0].split("#")[0].trim();
  }
  return str;
}

function handleGetFacturas(sheetId, tabName) {
  try {
    var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName || "Facturas");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", total: 0, facturas: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol < 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", total: 0, facturas: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var facturas = [];
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var idCol = String(row[0] || "").trim();
      var provCol = String(row[2] || "").trim();
      var conceptoCol = String(row[3] || "").trim();
      if (!idCol && !provCol && !conceptoCol) continue;
      facturas.push(row);
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      total: facturas.length,
      facturas: facturas
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
