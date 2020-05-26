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

function pauseAdsByUrl(ads, urls) {
  Logger.log('pausing - Number of ads to check: ' + ads.totalNumEntities());

  while (ads.hasNext()) {
    var ad = ads.next();
    var url = ad.urls().getFinalUrl();

    if (url && urls.indexOf(url) !== -1) {
      Logger.log(url + ' ' + 'OUT OF STOCK');
      ad.pause();
      ad.applyLabel(outOfStockLabelName.replace('"', '').replace('"', ''));
    }
  }
}

function resumeAdsByUrl(ads, urls) {
  Logger.log('pausing - Number of ads to check: ' + ads.totalNumEntities());

  while (ads.hasNext()) {
    var ad = ads.next();
    var url = ad.urls().getFinalUrl();

    if (url && urls.indexOf(url) !== -1) {
      Logger.log(url + ' ' + 'BACK IN STOCK');
      ad.enable();
      ad.labels().withCondition(
          'LabelName = ' + outOfStockLabelName).get().next().remove();
    }
  }
}

function getInStockUrls() {
  return [];
}

function getOutOfStockUrls() {
  return [];
}

function main() {
  var activeAds = getActiveAds();
  var pausedAds = getPausedBecauseOfOutOfStockAds();

  var inStockUrls = getInStockUrls();
  var outOfStockUrls = getOutOfStockUrls();

  pauseAdsByUrl(activeAds, outOfStockUrls);
  if (pausedAds) resumeAdsByUrl(pausedAds, inStockUrls);
}