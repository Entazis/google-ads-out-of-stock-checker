/**
 * [Adwords Scripts] Pause out of stock products
 * Version: 1.0
 * maintained by Clicteq
 **/
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

//Specify what phrase/word campaign names should contain, use '' to ignore
CAMPAIGN_CONTAINS = '';

//Specify what phrase/word campaign names should not contain, use '' to ignore
CAMPAIGN_DOES_NOT_CONTAIN = '';

//Specify the html element that identifies out of stock items
OUT_OF_STOCK_TEXT = '<span class="sold_out">Sold Out</span>';

//Specify the URL's element that identifies product pages
DETAIL_PAGE_STRING = '/products/';

var outOfStockLabelName = '"Paused - Out of Stock"';

function getIdOrCreateLabelByName(name) {
  var labels = AdWordsApp.labels().withCondition('LabelName = ' + name);

  if (labels.get().totalNumEntities() === 0) {
    AdWordsApp.createLabel(name.replace('"', '').replace('"', ''));
    return 0;
  } else {
    return labels.get().next().getId();
  }

}

function parse(item) {
  return '"' + item + '"';
}

function getActiveAds() {
  var query = '';
  if (CAMPAIGN_CONTAINS && !CAMPAIGN_DOES_NOT_CONTAIN) {
    query = 'Status = ENABLED AND CampaignName CONTAINS '
        + parse(CAMPAIGN_CONTAINS);

  } else if (!CAMPAIGN_CONTAINS && CAMPAIGN_DOES_NOT_CONTAIN) {
    query = 'Status = ENABLED AND CampaignName DOES_NOT_CONTAIN '
        + parse(CAMPAIGN_DOES_NOT_CONTAIN);

  } else if (CAMPAIGN_CONTAINS && CAMPAIGN_DOES_NOT_CONTAIN) {
    query = 'Status = ENABLED AND CampaignName CONTAINS '
        + parse(CAMPAIGN_CONTAINS) + ' AND CampaignName DOES_NOT_CONTAIN '
        + parse(CAMPAIGN_DOES_NOT_CONTAIN);

  } else if (!CAMPAIGN_CONTAINS && !CAMPAIGN_DOES_NOT_CONTAIN) {
    query = 'Status = ENABLED';
  }

  return AdWordsApp.ads().withCondition(query).get();
}

function getPausedBecauseOfOutOfStockAds() {
  var labelId = getIdOrCreateLabelByName(outOfStockLabelName);
  if (labelId) {
    return AdWordsApp.ads().withCondition(
        'LabelNames CONTAINS_ANY ' + '[' + outOfStockLabelName + ']').get();
  } else {
    return null;
  }
}

function pauseAdsIfNotAvailable(ads, urlAvailabilityMap) {
  Logger.log('pausing - Number of ads to check: ' + ads.totalNumEntities());

  while (ads.hasNext()) {
    var ad = ads.next();
    var url = ad.urls().getFinalUrl();

    if (url && urlAvailabilityMap[url] === false) {
      Logger.log(url + ' ' + 'OUT OF STOCK');
      ad.pause();
      ad.applyLabel(outOfStockLabelName.replace('"', '').replace('"', ''));
    }
  }
}

function resumeAdsIfAvailable(ads, urlAvailabilityMap) {
  Logger.log('resuming - Number of ads to check: ' + ads.totalNumEntities());

  while (ads.hasNext()) {
    var ad = ads.next();
    var url = ad.urls().getFinalUrl();

    if (url && urlAvailabilityMap[url]) {
      Logger.log(url + ' ' + 'BACK IN STOCK');
      ad.enable();
      ad.labels().withCondition(
          'LabelName = ' + outOfStockLabelName).get().next().remove();
    }
  }
}

function getUrlAvailabilityMap() {
  var csvUrl = "http://zalacliphairextensions.com.au/media/feeds/google/au.csv";
  var csvContent = UrlFetchApp.fetch(csvUrl).getContentText();
  var csvData = parseCsv(csvContent);

  var urlIndex = csvData[0].indexOf('link');
  var availabilityIndex = csvData[0].indexOf('availability');

  var urlAvailabilityMap = {};
  for (var i=1; i<csvData.length; i++) {
    urlAvailabilityMap[csvData[i][urlIndex]] = csvData[i][availabilityIndex] === 'in stock';
  }

  return urlAvailabilityMap;
}

function parseCsv(csvString) {
  var sanitizedString = csvString.replace(/(["'])(?:(?=(\\?))\2[\s\S])*?\1/g, function(e){return e.replace(/\r?\n|\r/g, ' ') });
  return Utilities.parseCsv(sanitizedString);
}

function main() {
  var activeAds = getActiveAds();
  var pausedAds = getPausedBecauseOfOutOfStockAds();

  var urlAvailabilityMap = getUrlAvailabilityMap();

  pauseAdsIfNotAvailable(activeAds, urlAvailabilityMap);
  if (pausedAds) resumeAdsIfAvailable(pausedAds, urlAvailabilityMap);
}