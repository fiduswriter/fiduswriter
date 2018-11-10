export const documentConstructorTemplate = () => `<table>
        <thead>
            <tr>
                <th>Element types</th>
                <th>Document structure</th>
                <th>Delete</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="from-container">
                    <div class="doc-part" id="heading">
                        <div class="title">Heading</div>
                        <div class="attrs">
                            <label>ID <input type="text"></label>
                            <label>Locked? <input type="checkbox"></label>
                            <label>Prefilled content <input type="text"></label>
                            <label>Instructions<textarea></textarea></label>
                        </div>
                    </div>
                    <div class="doc-part" id="contributors">
                        <div class="title">Namelist</div>
                        <div class="attrs">
                            <label>ID <input type="text"></label>
                            <label>Prefilled content <input type="text"></label>
                            <label>Instructions<textarea></textarea></label>
                        </div>
                    </div>
                    <div class="doc-part" id="richtext">
                        <div class="title">Richtext</div>
                        <div class="attrs">
                            <label>ID <input type="text"></label>
                            <label>Whitelist elements <input type="text" value="h1 h2 h3 h4 h5 h6 p code citation equation"></label>
                            <label>Whitelist marks <input type="text" value="strong emph highlight underline"></label>
                            <label>Prefilled content<textarea></textarea></label>
                            <label>Instructions<textarea></textarea></label>
                        </div>
                    </div>
                    <div class="doc-part" id="tags">
                        <div class="title">Tags</div>
                        <div class="attrs">
                            <label>ID <input type="text"></label>
                            <label>Prefilled content <input type="text"></label>
                            <label>Instructions<textarea></textarea></label>
                        </div>
                    </div>
                    <div class="doc-part" id="table">
                        <div class="title">Table</div>
                        <div class="attrs">
                            <label>ID <input type="text"></label>
                            <label>Type
                                <form action="">
                                    <input type="radio" name="table" value="free"> Free<br>
                                    <input type="radio" name="table" value="fixes"> Fixed<br>
                                    <input type="radio" name="table" value="rows"> Can add/remove rows
                                </form>
                            </label>
                            <label>Prefilled content <input type="text"></label>
                            <label>Instructions<textarea></textarea></label>
                        </div>
                    </div>
                </td>
                <td class="to-container">
                    <div class="doc-part" id="heading">Title</div>
                </td>
                <td class="trash">
                </td>
            </tr>
        </tbody>
    </table>`
