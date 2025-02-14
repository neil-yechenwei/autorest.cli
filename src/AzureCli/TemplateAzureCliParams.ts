﻿/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CodeModelCli, CommandParameter } from "./CodeModelCli"
import { ModuleOption } from "../Common/ModuleMap";
import { EscapeString, ToCamelCase, Capitalize } from "../Common/Helpers";

export function GenerateAzureCliParams(model: CodeModelCli) : string[] {
    let output: string[] = [];
    let hasActions: boolean = false;
    let actions: string[] = [];

    output.push("# --------------------------------------------------------------------------------------------");
    output.push("# Copyright (c) Microsoft Corporation. All rights reserved.");
    output.push("# Licensed under the MIT License. See License.txt in the project root for license information.");
    output.push("# --------------------------------------------------------------------------------------------");
    output.push("# pylint: disable=line-too-long");
    output.push("# pylint: disable=too-many-lines");
    output.push("# pylint: disable=too-many-statements");   
    output.push("");
    //output.push("from knack.arguments import CLIArgumentType");
    output.push("from azure.cli.core.commands.parameters import (");
    output.push("    tags_type,");
    //output.push("    get_resource_name_completion_list,");
    //output.push("    quotes,");
    //output.push("    get_three_state_flag,");
    output.push("    get_enum_type,");
    output.push("    resource_group_name_type,");
    output.push("    get_location_type");
    output.push(")");
    //output.push("from azure.cli.core.commands.validators import get_default_location_from_resource_group");
    
    
    var output_args: string[] = [];

    output_args.push("");
    output_args.push("");
    output_args.push("def load_arguments(self, _):");
    //output.push("    name_arg_type = CLIArgumentType(options_list=('--name', '-n'), metavar='NAME')");

    do
    {
        let options: ModuleOption[] = model.ModuleOptions;
        let methods: string[] = model.GetCliCommandMethods();
        for (let mi = 0; mi < methods.length; mi++)
        {
            let method: string = methods[mi];

            let ctx = model.GetCliCommandContext(method);
            if (ctx == null)
                continue;

            output_args.push("");
            output_args.push("    with self.argument_context('" + model.GetCliCommand() + " " + method + "') as c:");

            if (ctx.Parameters.length == 0)
            {
                output_args.push("        pass");
            }
            else
            {
                let params: CommandParameter[] = ctx.Parameters;

                params.forEach(element => {
                    let parameterName: string = element.Name.split("-").join("_");
                    let argument = "        c.argument('" + parameterName + "'";

                    // this is to handle names like "format", "type", etc
                    if (parameterName == "type" || parameterName == "format")
                    {
                        argument = "        c.argument('_" + parameterName + "'";
                        argument += ", options_list=['--" + parameterName + "']";
                    }

                    if (element.Type == "boolean")
                    {
                        argument += ", arg_type=get_three_state_flag()";
                    }
                    else if ((element.EnumValues.length > 0) && !element.IsList)
                    {
                        argument += ", arg_type=get_enum_type([";

                        element.EnumValues.forEach(element => {
                            if (!argument.endsWith("[")) argument += ", ";
                            argument += "'" + element + "'";
                        });
                        argument += "])";
                    }

                    if (parameterName == "resource_group")
                    {
                        argument += ", resource_group_name_type";
                    }
                    else if (parameterName == "tags")
                    {
                        argument += ", tags_type";
                    }
                    else if (parameterName == "location")
                    {
                        argument += ", arg_type=get_location_type(self.cli_ctx)";
                    }
                    else
                    {
                        argument += ", id_part=None, help='" + EscapeString(element.Help) + "'"; 
                    }

                    if (element.IsList)
                    {
                        if (element.Type == "dict")
                        {
                            let actionName: string = "PeeringAdd" + Capitalize(ToCamelCase(element.Name));
                            argument += ", action=" + actionName;
                            hasActions = true;

                            if (actions.indexOf(actionName) < 0)
                            {
                                actions.push(actionName);
                            }
                        }
                        argument += ", nargs='+'";
                    }

                    argument += ")";

                    output_args.push(argument);
                });
            }
        }
    } while (model.NextModule());

    if (hasActions)
    {
        output.push("from azext_" + model.GetCliCommandModuleNameUnderscored() + ".action import (")

        for (let idx: number = 0; idx < actions.length; idx++)
        {
            let action = actions[idx];
            output.push("    " + action + (idx < actions.length - 1 ? "," : ""));
        }
        output.push(")")
    }

    output = output.concat(output_args);

    output.push("");
    return output;
}
