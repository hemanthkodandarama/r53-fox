/*
R53 Fox - a GUI client of Amazon Route 53
Copyright (C) 2011 Genki Sugawara

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

Components.utils.import('resource://r53fox/io.jsm');

function Exporter() {
}

Exporter.prototype = {
  exportData: function() {
    var fp = createFilePicker();
    fp.init(window, 'Export Data to JSON', Components.interfaces.nsIFilePicker.modeSave);
    fp.defaultString = 'zones.json';
    fp.appendFilter('JavaScript Object Notation (*.json)', '*.json');

    var result = fp.show();

    switch (result) {
    case Components.interfaces.nsIFilePicker.returnOK:
    case Components.interfaces.nsIFilePicker.returnReplace:
      this.writeDataToFile(fp.file);
      break;
    }
  },

  writeDataToFile: function(fout) {
    var data = {};

    function basehzid(hzid) {
      hzid = hzid.split('/');
      return hzid[hzid.length - 1];
    }

    $R53(function(r53cli) {
      var xhr = r53cli.listHostedZones();
      for each (var member in xhr.xml()..HostedZones.HostedZone) {
        data[member.Name.toString()] = {
          HostedZoneId: basehzid(member.Id.toString()),
          CallerReference: member.CallerReference.toString(),
          Comment: member.Config.Comment.toString(),
          ResourceRecordSets: []
        };
      }
    }.bind(this), $('main-window-loader'));

    for (var name in data) {
      var rrsets = data[name].ResourceRecordSets;
      var hzid = data[name].HostedZoneId;

      $R53(function(r53cli) {
        var xhr = r53cli.listResourceRecordSets(hzid);

        for each (var member in xhr.xml()..ResourceRecordSets.ResourceRecordSet) {
          var values = [];

          var row = {
            Name: member.Name.toString(),
            SetIdentifier: member.SetIdentifier.toString(),
            Weight: member.Weight.toString(),
            TTL: member.TTL.toString(),
            Value: values
          };

          if (member.AliasTarget.toString().trim()) {
            row.Type = 'A (Alias)';
            values.push(member.AliasTarget.DNSName.toString());
          } else {
            for each (var rr in member..ResourceRecords.ResourceRecord) {
              values.push(rr.Value.toString());
            }

            row.Type = member.Type.toString();
          }

          rrsets.push(row);
        }
      }.bind(this), $('main-window-loader'));
    }

    var rv = FileIO.write(fout, JSON.stringify(data, null, "  "));

    return rv;
  }
};
