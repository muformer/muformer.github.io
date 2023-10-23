async function LoadTable(tablefilepath) {
    var rows = await d3.tsv(tablefilepath);
    rows = rows.map(function(row) {
        var newrow = {};
        for (var key in row) {
            if (key == 'prediction') {
                newrow[key] = parseFloat(row[key]).toFixed(4);
            } else {
                newrow[key] = row[key];
            }
        }
        return newrow;
    });
    return rows;
}
function ShowPagedTable(rows, tablepos, colnames, pageidx, instance, recperpage=10) {
    subset_rows = rows.slice(pageidx*recperpage, (pageidx+1)*recperpage);
    $(tablepos).empty();
    $(tablepos).html("<thead style='width: 100%;'><tr style='width: 100%;'></tr></thead><tbody style='width: 100%;'></tbody>");
    for (colname of colnames) {
        var toshow_colname = transformcolname(colname);
        $(tablepos + ' thead tr').append("<th name="+colname+" style='cursor: pointer'>" + toshow_colname + '</th>');
    }
    for (row of subset_rows) {
        var newrow = '<tr>'
        for (colname of colnames) {
            var toshow_content = row[colname];
            if (colname == 'mutant') {
                var td_style = "'white-space:nowrap;cursor:pointer'";
            } else {
                var td_style = "'white-space:nowrap'";
            }
            newrow += "<td style="+td_style+" name="+colname+">" + toshow_content + '</td>';
        }
        newrow += '</tr>';
        $(tablepos + ' tbody').append(newrow);
    }
    $("th").click(function() {
        var isTrue = String($(this).attr("asc")).toLowerCase();
        var ascending = isTrue !== "true";
        var colname = $(this).attr("name");
        var coltext = $(this).text();
        var sorted = SortTable(rows, colname, ascending);
        ShowPagedTable(sorted, '#fitness-table', ['mutant', 'score', 'prediction'], 0, instance, 10);
        if (ascending) {
            var icon = "<i class='fas fa-sort-up'></i>";
        } else {
            var icon = "<i class='fas fa-sort-down'></i>";
        }
        $("th[name="+colname+"]").html(coltext+icon);
        $("th[name="+colname+"]").attr({"asc": ascending});
    });
    $("td[name='mutant']").click(function() {
        var query_positions = $(this).text().split(',').map(function(mutation) {
            return parseInt(mutation.slice(1, -1));
        });
        var instance_selection = query_positions.map(function(position) {
            return {
                auth_asym_id: 'A',
                auth_residue_number: position,
                color:{r:255,g:0,b:0},
                representation:'line'
            }
        });
        instance.visual.update()
        instance.visual.select({data:instance_selection})
        instance.visual.highlight({data:instance_selection})
    });
}
function transformcolname(colname) {
    var colname_dict = {
        'pos': 'Residue Indices',
        'score': 'Experimental&nbsp<br>Fitness',
        'prediction': 'Predicted&nbsp<br>Fitness',
        'mutant': 'Mutants',
    }
    return colname_dict[colname];
}
function removeduplicates(arr) {
    return arr.filter(function(item, pos) {
        return arr.indexOf(item) == pos;
    }).sort(function(a, b) {
        return a - b;});
}
function PreparePlotData(rows) {
    var y_names = Object.keys(rows[0]);
    y_names = y_names.filter(function(y) {return y != 'x';});
    var x_names = rows.map(function(row) {
        return row['x'];
    });
    var z_data = [];
    var datarows = rows.map(function(row) {
        var newrow = {};
        for (var key in row) {
            if (key != 'x') {
                newrow[key] = parseFloat(row[key]);
            }
        }
        return newrow;
    });
    var z_data = datarows.map(function(row) {
        return Object.values(row);
    });
    return [x_names, y_names, z_data];
}
function PlotSurface(x_names, y_names, z_datas, figpos) {
    var data = z_datas.map(function(z_data) {
        return {
            z: z_data,
            type: 'surface',
            contours: {
                z: {
                show:true,
                usecolormap: true,
                highlightcolor:"#42f462",
                project:{z: true}
                }
            },
            showscale: false,
            opacity: 0.5,
        }
    });
    var tick_step = 5;
    var layout = {
        title: 'Fitness Landscape',
        autosize: true,
        width: 500,
        height: 480,
        margin: {
            l: 0,
            r: 0,
            b: 20,
            t: 0,
        },
        scene: {
            xaxis: {
                title: 'Residue Index',
                tickvals: [...Array(x_names.length).keys()].filter(function(x) {return x % tick_step == 0;}),
                ticktext: x_names.map(function(x) {return x.toString();}).filter(function(x, i) {return i % tick_step == 0;}),
                tickmode: 'array',
            },
            yaxis: {
                title: 'Residue Index',
                tickvals: [...Array(y_names.length).keys()].filter(function(y) {return y % tick_step == 0;}),
                ticktext: y_names.map(function(y) {return y.toString();}).filter(function(y, i) {return i % tick_step == 0;}),
                tickmode: 'array',
            },
            camera: {
                center: {
                    x: 0,
                    y: 0,
                    z: -0.4,
                },
                eye: {
                    x: -1,
                    y: -2,
                    z: 0.5,
                },
            }
        }
    };
    Plotly.newPlot(figpos, data, layout);
}
function comparer(index) {
    return function(a, b) {
        var valA = a[index], valB = b[index];
        return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.toString().localeCompare(valB)
    }
}
function SortTable(parsed, index, asc=true) {
    var sorted = parsed.sort(comparer(index));
    if (!asc) {
        sorted.reverse();
    };
    return sorted
}
function UpdatePagination(parsed, pagebtn_idprefix="page-", pagebtn_loc="fitness-pagination-container", numrows=10) {
    $("#"+pagebtn_loc).html("Page: ");
    var numpages = Math.ceil(parsed.length / numrows);
    const shownumpages = 3;
    for (let i = 1; i <= numpages; i++) {
        $("#"+pagebtn_loc).append("<a name='page-button' id='" + pagebtn_idprefix + i + "' class='btn btn--inverse'>" + i + "</a> ");
        if ((i <= shownumpages) || (i === numpages)) {
        } else {
            $("#"+pagebtn_idprefix + i).hide();
        };
        if (i === 1) {
            $("#"+pagebtn_loc).append("<span id="+pagebtn_idprefix+"sep-first> </span>");
        } else if (i === numpages-1) {
            $("#"+pagebtn_loc).append("<span id="+pagebtn_idprefix+"sep-last>... </span>");
        } else {
        };
    };
    $("#"+pagebtn_idprefix+"1").attr("style", "font-size:0.9em;border-width:2px");
}
function ChangePage(pageindex, pagebtn_idprefix="page-", pagebtn_loc="fitness-pagination-container") {
    var pageindex = parseInt(pageindex);
    const shownumpages = 2;
    $("a[class='btn btn--inverse']").attr("style", "font-size:0.75em;border-width:1px");
    var numpages = $("#fitness-pagination-container a").length;
    $.each($("#"+pagebtn_loc+" a"), function(index, element) {
        $(element).hide();
    });
    var firstpageindex = Math.max(1, pageindex - shownumpages);
    var lastpageindex = Math.min(pageindex + shownumpages, numpages);
    for (let i = firstpageindex; i <= lastpageindex; i++) {
        $("#"+pagebtn_idprefix+ i).show();
    };
    $("#page-" + pageindex).attr("style", "font-size:0.9em;border-width:2px");
    if (firstpageindex > 1) {
        $("#"+pagebtn_idprefix+"1").show();
    };
    if (lastpageindex < numpages) {
        $("#"+pagebtn_idprefix + numpages).show();
    };
    if (firstpageindex > 2) {
        $("#"+pagebtn_idprefix+"sep-first").text("... ");
    } else {
        $("#"+pagebtn_idprefix+"sep-first").text(" ");
    };
    if (lastpageindex < numpages-1) {
        $("#"+pagebtn_idprefix+"sep-last").text("... ");
    } else {
        $("#"+pagebtn_idprefix+"sep-last").text(" ");
    };
}
function AddQueryMutation(rows, mutation_colname='mutant', query_loc='fitness-query', maxnum=5, curridx=2, addminus=false) {
    var maxnum_mutations = rows.map(function(row) {
        return row[mutation_colname].split(',').length;
    }).reduce(function(a, b) {
        return Math.max(a, b);
    });
    maxnum_mutations = Math.min(maxnum_mutations, maxnum); 
    var i = curridx;
    if (i == 1) {
        var number_suffix = "st";
    } else if (i == 2) {
        var number_suffix = "nd";
    } else if (i == 3) {
        var number_suffix = "rd";
    } else {
        var number_suffix = "th";
    }
    $("#"+query_loc).append("<div id='fitness-mutation-div-" + i + "' style='display:inline-block;padding-right:5px'></div>")
    $("#"+"fitness-mutation-div-" + i).append("<label for='fitness-mutation-" + i + "' style='display:inline'>" + i + "<sup>" + number_suffix + "</sup> Mutation:&nbsp&nbsp</label>");
    $("#"+"fitness-mutation-div-" + i).append("<input list='fitness-mutation-select-" + i + "' id='fitness-mutation-" + i + "' style='width: 5em'>");
    $("#"+"fitness-mutation-div-" + i).append("<datalist id='fitness-mutation-select-" + i + "'></datalist>");
    if (i < maxnum_mutations) {
        $("#"+"fitness-mutation-div-" + i).append("<i curridx="+i+" class='fas fa-plus' style='color: #323c4d;'></i>&nbsp&nbsp");
    }
    if (addminus && (i > 1)) {
        $("#"+"fitness-mutation-div-" + i).append("<i curridx="+i+" class='fas fa-minus' style='color: #323c4d;'></i>&nbsp&nbsp");
    }
    $("#"+"fitness-mutation-div-" + i).append("<br>");
}
function UpdateMutationOptions(rows, query_mutations, mutation_select_id="#fitness-mutation-select-1", mutation_colname='mutant') {
    var mutation_options = [];
    for (row of rows) {
        var mutants = row[mutation_colname].split(',');
        for (mutant of mutants) {
            mutation_options.push(mutant);
        }
    }
    mutation_options = removeduplicates(mutation_options).sort(function(a, b) {return a.localeCompare(b);});
    mutation_options = mutation_options.filter(function(mutation) {
        return query_mutations.includes(mutation)==false;
    });
    for (mutation of mutation_options) {
        $(mutation_select_id).append("<option value='" + mutation + "'>" + "</option>");
    }
    return mutation_options;
}
function LoadProcessedMutationOptions(rows, mutation_select_pos="fitness-mutation-select-1", mutation_colname='mutation') {
    mutation_options = rows.map(function(row) {
        return row[mutation_colname];
    });
    for (mutation of mutation_options) {
        $("#"+mutation_select_pos).append("<option value='" + mutation + "'>" + "</option>");
    }
    return mutation_options;
}
function SubsetTable(rows, mutations_str, mutation_colname='mutant') {
    var query_mutations = mutations_str.split(',');
    var next_rows = rows.filter(function(row) {
        return query_mutations.map(function(query_mutation) {
            return row[mutation_colname].includes(query_mutation);
        }).reduce(function(a, b) {
            return a && b;
        });
    });
    return next_rows
}
function ProcessQueries(inputpos='#fitness-query input', rows) {
    var query_mutations = [];
    $.each($(inputpos), function(index, element) {
        query_mutations.push($(element).val());
    });
    query_mutations = query_mutations.filter(function(query_mutation) {
        return query_mutation != '';
    });
    var query_mutations_str = removeduplicates(query_mutations).join(',');
    var target_rows = SubsetTable(rows, query_mutations_str, 'mutant')
    if (target_rows.length == 0) {
        target_rows = [{mutant: query_mutations_str, score: 'N/A', prediction: 'N/A'}]
    }
    return [target_rows, query_mutations]
}
function TablePipeline(rows, instance) {
    ShowPagedTable(rows, '#fitness-table', ['mutant', 'score', 'prediction'], 0, instance, 10);
    
    UpdatePagination(rows);
    $("a[name='page-button']").click(function() {
        var pageindex = $(this).text();
        ChangePage(pageindex);
        ShowPagedTable(rows, '#fitness-table', ['mutant', 'score', 'prediction'], pageindex-1, instance, 10);
    });
}