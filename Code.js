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

function getPausedAds(labelName) {
  return AdWordsApp.ads().withCondition(
      'LabelNames CONTAINS_ANY ' + '[' + labelName + ']').get();
}

function pauseAds(ads, labelName) {
  Logger.log('Checking enabled ads... Number of ads to check: '
      + ads.totalNumEntities());

  while (ads.hasNext()) {
    var ad = ads.next();
    var url = ad.urls().getFinalUrl();
    if (!url || url.search(DETAIL_PAGE_STRING) === -1) {
      continue
    }

    var content = UrlFetchApp.fetch(url).getContentText();
    var isOutOfStock = content.search(OUT_OF_STOCK_TEXT);
    if (isOutOfStock > -1) {
      Logger.log(url + ' ' + 'OUT OF STOCK');
      ad.pause();
      ad.applyLabel(labelName.replace('"', '').replace('"', ''));
    }
  }
}

function resumeAds(ads, labelName) {
  Logger.log('Checking paused ads... Number of ads to check: '
      + ads.totalNumEntities());

  while (ads.hasNext()) {
    var ad = ads.next();
    var url = ad.urls().getFinalUrl();
    if (!url) {
      continue
    }

    var content = UrlFetchApp.fetch(url).getContentText();
    var isOutOfStock = content.search(OUT_OF_STOCK_TEXT);
    if (isOutOfStock === -1) {
      Logger.log(url + ' ' + 'BACK IN STOCK');
      ad.enable();
      ad.labels().withCondition(
          'LabelName = ' + labelName).get().next().remove();
    }
  }
}

function main() {
  var labelName = '"Paused - Out of Stock"';
  var labelId = getIdOrCreateLabelByName(labelName);
  var ads = getActiveAds();

  pauseAds(ads, labelName);

  if (labelId !== 0) {
    var pausedAds = getPausedAds(labelName);
    resumeAds(pausedAds, labelName);
  }
}