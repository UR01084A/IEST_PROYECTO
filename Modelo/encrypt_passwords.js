import { supabase } from "./supabase.js";
import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.js";

(async () => {
  const { data: usuarios, error } = await supabase.from("usuarios").select("id,password_hash");
  if (error) return console.error("Error obteniendo usuarios:", error);

  for (const u of usuarios) {
    if (!u.password_hash.startsWith("$2a$")) {
      const nuevoHash = bcrypt.hashSync(u.password_hash, 10);
      const { error: updError } = await supabase
        .from("usuarios")
        .update({ password_hash: nuevoHash })
        .eq("id", u.id);
      if (updError) console.error(`Error actualizando usuario ${u.id}`, updError);
      else console.log(`Usuario ${u.id} actualizado correctamente`);
    }
  }
})();
